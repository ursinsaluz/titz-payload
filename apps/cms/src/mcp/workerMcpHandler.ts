import crypto from 'crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import {
  type CollectionSlug,
  type Config,
  configToJSONSchema,
  type Endpoint,
  type Field,
  type GlobalSlug,
  type PayloadRequest,
  type Plugin,
  type TypedUser,
  UnauthorizedError,
  type Where,
} from 'payload'
import { z } from 'zod'

/**
 * Worker-kompatibler MCP-Handler für Payload auf Cloudflare Workers.
 *
 * `@payloadcms/plugin-mcp` (3.88.0) bringt auf Cloudflare Workers zwei Fehler
 * mit, die jede authentisierte Anfrage an `/api/mcp` mit HTTP 500 (Error 1101)
 * abbrechen lassen:
 *
 * 1. `mcp-handler` wickelt Web-Standard-Requests in einen gefälschten Node-HTTP-
 *    Zyklus (`new IncomingMessage(new Socket())` + `new ServerResponse(req)` +
 *    `createServerResponseAdapter`). Mit `compatibility_date: "2025-08-15"` ist
 *    `http.ServerResponse` in `workerd` nicht implementiert und wirft synchron
 *    `Error: The ServerResponse method is not implemented`. Weil
 *    `createServerResponseAdapter` den Aufruf als `void fn(fakeServerResponse)`
 *    ohne `.catch()` startet, löst `writeHeadPromise` nie auf — die Runtime
 *    erkennt das unaufgelöste Promise und bricht den Request mit
 *    «The Workers runtime canceled this request because it detected that your
 *    Worker's code had hung» ab.
 *
 * 2. `convertCollectionSchemaToZod` wandelt das JSON-Schema jeder Sammlung per
 *    `json-schema-to-zod` + `ts.transpileModule` + `new Function('z', ...)` in
 *    ein Zod-Schema um. In Cloudflare Workers ist `new Function` verboten
 *    (`EvalError: Code generation from strings disallowed for this context`).
 *    Der `catch`-Zweig gibt `z.record(z.any())` zurück, woraufhin
 *    `updateResourceTool` beim Aufruf von `convertedFields.partial()` mit
 *    `TypeError: convertedFields.partial is not a function` abstürzt (`ZodRecord`
 *    besitzt kein `.partial()`).
 *
 * Dieses Modul nutzt weiterhin `mcpPlugin` für die Collection
 * `payload-mcp-api-keys` (damit Datenbank-Schema und Admin-UI unverändert
 * bleiben), ersetzt aber die beiden `/mcp`-Endpunkte durch den direkten
 * `WebStandardStreamableHTTPServerTransport` des `@modelcontextprotocol/sdk`
 * und einen eval-freien JSON-Schema-zu-Zod-Konverter.
 */

type EntitaetsKonfig = {
  description?: string
  enabled?: boolean
}

export type WorkerMcpOptionen = {
  collections: Partial<Record<CollectionSlug, EntitaetsKonfig>>
  globals: Partial<Record<GlobalSlug, EntitaetsKonfig>>
  userCollection?: CollectionSlug
}

type JsonSchemaKnoten = {
  additionalProperties?: boolean | JsonSchemaKnoten
  anyOf?: JsonSchemaKnoten[]
  description?: string
  enum?: unknown[]
  items?: JsonSchemaKnoten | JsonSchemaKnoten[]
  oneOf?: JsonSchemaKnoten[]
  properties?: Record<string, JsonSchemaKnoten>
  required?: string[]
  type?: string | string[]
  $ref?: string
}

export const toCamelCase = (str: string): string =>
  str.replace(/-([a-z])/g, (_, buchstabe: string) => buchstabe.toUpperCase())

const toolSuffix = (slug: string): string => {
  const camel = toCamelCase(slug)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

/**
 * Entfernt interne Payload-Felder (`id`, `createdAt`, `updatedAt`) und löst
 * `$ref`-Verweise in `oneOf`-Beziehungen auf einfache ID-Typen auf, damit
 * MCP-Clients beim Anlegen und Bearbeiten nur die echten Inhaltsfelder sehen.
 */
export function bereinigeJsonSchema(rohesSchema: JsonSchemaKnoten): JsonSchemaKnoten {
  const klon = JSON.parse(JSON.stringify(rohesSchema ?? {})) as JsonSchemaKnoten

  if (klon.properties) {
    delete klon.properties.id
    delete klon.properties.createdAt
    delete klon.properties.updatedAt
  }
  if (Array.isArray(klon.required)) {
    klon.required = klon.required.filter(
      (f) => f !== 'id' && f !== 'createdAt' && f !== 'updatedAt',
    )
    if (klon.required.length === 0) delete klon.required
  }

  const vereinfache = (knoten: JsonSchemaKnoten): JsonSchemaKnoten => {
    if (!knoten || typeof knoten !== 'object') return knoten
    const kopie: JsonSchemaKnoten = { ...knoten }

    if (Array.isArray(kopie.type)) {
      const ohneNull = kopie.type.filter((t) => t !== 'null')
      if (ohneNull.length === 1 && (ohneNull[0] === 'array' || ohneNull[0] === 'object')) {
        kopie.type = ohneNull[0]
      }
    }

    if (Array.isArray(kopie.oneOf)) {
      const hatRef = kopie.oneOf.some((opt) => opt && typeof opt === 'object' && '$ref' in opt)
      const verbleibend = (
        hatRef
          ? kopie.oneOf.filter((opt) => !(opt && typeof opt === 'object' && '$ref' in opt))
          : kopie.oneOf
      ).map(vereinfache)
      delete kopie.oneOf
      if (verbleibend.length === 1) {
        Object.assign(kopie, verbleibend[0])
      } else if (verbleibend.length > 1) {
        kopie.anyOf = verbleibend
      }
    }

    if (kopie.properties && typeof kopie.properties === 'object') {
      kopie.properties = Object.fromEntries(
        Object.entries(kopie.properties).map(([schluessel, wert]) => [
          schluessel,
          vereinfache(wert),
        ]),
      )
    }
    if (kopie.items && typeof kopie.items === 'object' && !Array.isArray(kopie.items)) {
      kopie.items = vereinfache(kopie.items)
    }
    return kopie
  }

  return vereinfache(klon)
}

function jsonSchemaEigenschaftZuZod(prop: JsonSchemaKnoten, istPflicht: boolean): z.ZodTypeAny {
  if (!prop || typeof prop !== 'object') return z.any().optional()

  const roherTyp = Array.isArray(prop.type) ? prop.type.find((t) => t !== 'null') : prop.type
  const istNullable =
    prop.type === 'null' || (Array.isArray(prop.type) && prop.type.includes('null'))

  if (roherTyp === 'null' && !Array.isArray(prop.type)) {
    return z.null()
  }

  let schema: z.ZodTypeAny
  const enumWerte = Array.isArray(prop.enum)
    ? prop.enum.filter((v): v is string => typeof v === 'string')
    : null

  if (enumWerte && enumWerte.length > 0) {
    schema = z.enum(enumWerte as [string, ...string[]])
  } else if (Array.isArray(prop.anyOf) || Array.isArray(prop.oneOf)) {
    const varianten = prop.anyOf ?? prop.oneOf ?? []
    const hatNull = varianten.some((v) => v?.type === 'null')
    const ohneNull = varianten
      .filter((v) => v?.type !== 'null')
      .map((v) => jsonSchemaEigenschaftZuZod(v, true))
    if (ohneNull.length === 0) {
      schema = z.null()
    } else if (ohneNull.length === 1) {
      schema = ohneNull[0]
    } else {
      schema = z.union(ohneNull as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]])
    }
    if (hatNull) schema = schema.nullable()
  } else if (roherTyp === 'string') {
    schema = z.string()
  } else if (roherTyp === 'number' || roherTyp === 'integer') {
    schema = z.number()
  } else if (roherTyp === 'boolean') {
    schema = z.boolean()
  } else if (roherTyp === 'array') {
    const elementSchema =
      prop.items && !Array.isArray(prop.items)
        ? jsonSchemaEigenschaftZuZod(prop.items, true)
        : z.any()
    schema = z.array(elementSchema)
  } else if (roherTyp === 'object' || prop.properties) {
    if (prop.properties && typeof prop.properties === 'object') {
      const obj = jsonSchemaZuZodObjekt(prop)
      schema = prop.additionalProperties ? obj.passthrough() : obj
    } else {
      schema = z.record(z.string(), z.any())
    }
  } else {
    schema = z.any()
  }

  if (prop.description) {
    schema = schema.describe(prop.description)
  }
  if (istNullable) {
    schema = schema.nullable()
  }
  if (!istPflicht) {
    schema = schema.optional()
  }
  return schema
}

/**
 * Baut aus einem JSON-Schema direkt ein `z.ZodObject`, ohne Codegenerierung
 * über `new Function`. Damit funktioniert sowohl `.shape` für `create*` als
 * auch `.partial().shape` für `update*` in Cloudflare Workers.
 */
export function jsonSchemaZuZodObjekt(
  rohesSchema: JsonSchemaKnoten,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const bereinigt = bereinigeJsonSchema(rohesSchema)
  const eigenschaften = bereinigt.properties ?? {}
  const pflicht = new Set(Array.isArray(bereinigt.required) ? bereinigt.required : [])
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const [schluessel, prop] of Object.entries(eigenschaften)) {
    shape[schluessel] = jsonSchemaEigenschaftZuZod(prop, pflicht.has(schluessel))
  }
  return z.object(shape)
}

function virtuelleFelder(felder: Field[]): string[] {
  const namen: string[] = []
  for (const feld of felder) {
    if ('name' in feld && 'virtual' in feld && feld.virtual) {
      namen.push(feld.name)
    } else if ('fields' in feld && Array.isArray(feld.fields) && !('name' in feld)) {
      namen.push(...virtuelleFelder(feld.fields))
    } else if (feld.type === 'tabs' && 'tabs' in feld) {
      for (const tab of feld.tabs) {
        if (!('name' in tab)) namen.push(...virtuelleFelder(tab.fields))
      }
    }
  }
  return namen
}

function entferneVirtuelleFelder(
  daten: Record<string, unknown>,
  namen: string[],
): Record<string, unknown> {
  if (namen.length === 0) return daten
  const ergebnis = { ...daten }
  for (const name of namen) delete ergebnis[name]
  return ergebnis
}

type McpBerechtigungen = {
  user: TypedUser
  zugriffe: Record<
    string,
    { create?: boolean; delete?: boolean; find?: boolean; update?: boolean } | undefined
  >
}

async function pruefeApiKey(
  req: PayloadRequest,
  userCollection: CollectionSlug,
): Promise<McpBerechtigungen> {
  const auth = req.headers.get('Authorization')
  const apiKey = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : null
  if (!apiKey) throw new UnauthorizedError()

  const sha256Index = crypto.createHmac('sha256', req.payload.secret).update(apiKey).digest('hex')
  const { docs } = await req.payload.find({
    collection: 'payload-mcp-api-keys',
    depth: 1,
    limit: 1,
    pagination: false,
    where: { apiKeyIndex: { equals: sha256Index } },
  })

  const doc = docs[0] as unknown as Record<string, unknown> | undefined
  if (!doc || !doc.user || typeof doc.user !== 'object' || !('id' in doc.user)) {
    throw new UnauthorizedError()
  }

  const user = doc.user as TypedUser & { _strategy?: string; collection?: string }
  ;(user as { collection?: string }).collection = userCollection
  user._strategy = 'mcp-api-key'
  return { user, zugriffe: doc as McpBerechtigungen['zugriffe'] }
}

function baueMcpServer(
  optionen: WorkerMcpOptionen,
  berechtigungen: McpBerechtigungen,
  req: PayloadRequest,
): McpServer {
  const { payload } = req
  const user = berechtigungen.user
  const server = new McpServer(
    { name: 'Payload MCP Server', version: '1.0.0' },
    { capabilities: { tools: { listChanged: true } } },
  )

  const configSchema = configToJSONSchema(payload.config, payload.db.defaultIDType, req.i18n, {
    forceInlineBlocks: true,
  })

  for (const [slug, konfig] of Object.entries(optionen.collections)) {
    if (!konfig?.enabled) continue
    const collectionSlug = slug as CollectionSlug
    const rechte = berechtigungen.zugriffe[toCamelCase(collectionSlug)]
    if (!rechte) continue

    const sammlung = payload.config.collections.find((c) => c.slug === collectionSlug)
    const virtuell = sammlung ? virtuelleFelder(sammlung.fields) : []
    const rohesSchema = (configSchema.definitions?.[collectionSlug] ?? {}) as JsonSchemaKnoten
    if (rohesSchema.properties) {
      for (const name of virtuell) delete rohesSchema.properties[name]
    }
    const feldSchema = jsonSchemaZuZodObjekt(rohesSchema)
    const suffix = toolSuffix(collectionSlug)
    const beschreibung = konfig.description?.trim()

    if (rechte.find) {
      server.registerTool(
        `find${suffix}`,
        {
          description:
            beschreibung ||
            'Find documents in a collection by ID or where clause using Find or FindByID.',
          inputSchema: {
            id: z
              .union([z.string(), z.number()])
              .optional()
              .describe(
                'Optional: specific document ID to retrieve. If not provided, returns all documents',
              ),
            depth: z
              .number()
              .int()
              .min(0)
              .max(10)
              .optional()
              .default(0)
              .describe('How many levels deep to populate relationships (default: 0)'),
            draft: z
              .boolean()
              .optional()
              .describe(
                'Optional: Whether the document should be queried from the versions table/collection or not.',
              ),
            limit: z
              .number()
              .int()
              .min(1)
              .max(100)
              .optional()
              .default(10)
              .describe('Maximum number of documents to return (default: 10, max: 100)'),
            page: z
              .number()
              .int()
              .min(1)
              .optional()
              .default(1)
              .describe('Page number for pagination (default: 1)'),
            select: z
              .string()
              .optional()
              .describe('Optional: define exactly which fields to return in the response (JSON)'),
            sort: z
              .string()
              .optional()
              .describe('Field to sort by (e.g., "createdAt", "-updatedAt" for descending)'),
            where: z
              .string()
              .optional()
              .describe(
                'Optional JSON string for where clause filtering (e.g., \'{"slug": {"equals": "home"}}\')',
              ),
          },
        },
        async (params: {
          id?: number | string
          depth?: number
          draft?: boolean
          limit?: number
          page?: number
          select?: string
          sort?: string
          where?: string
        }) => {
          const { id, depth = 0, draft, limit = 10, page = 1, select, sort, where } = params
          try {
            let whereKlausel: Where | undefined
            if (where) {
              try {
                whereKlausel = JSON.parse(where) as Where
              } catch {
                return { content: [{ type: 'text', text: 'Error: Invalid JSON in where clause' }] }
              }
            }
            let selectKlausel: Record<string, boolean> | undefined
            if (select) {
              try {
                selectKlausel = JSON.parse(select) as Record<string, boolean>
              } catch {
                return { content: [{ type: 'text', text: 'Error: Invalid JSON in select clause' }] }
              }
            }

            if (id !== undefined) {
              const doc = await payload.findByID({
                id,
                collection: collectionSlug,
                depth,
                ...(draft !== undefined && { draft }),
                ...(selectKlausel && { select: selectKlausel }),
                overrideAccess: false,
                req,
                user,
              })
              return {
                content: [
                  {
                    type: 'text',
                    text: `Resource from collection "${collectionSlug}":\n${JSON.stringify(doc)}`,
                  },
                ],
              }
            }

            const ergebnis = await payload.find({
              collection: collectionSlug,
              depth,
              limit,
              page,
              ...(draft !== undefined && { draft }),
              ...(selectKlausel && { select: selectKlausel }),
              ...(sort && { sort }),
              ...(whereKlausel && Object.keys(whereKlausel).length > 0 && { where: whereKlausel }),
              overrideAccess: false,
              req,
              user,
            })

            let text = `Collection: "${collectionSlug}"\nTotal: ${ergebnis.totalDocs} documents\nPage: ${ergebnis.page} of ${ergebnis.totalPages}\n`
            for (const doc of ergebnis.docs) {
              text += `\n\`\`\`json\n${JSON.stringify(doc)}\n\`\`\``
            }
            return { content: [{ type: 'text', text }] }
          } catch (fehler) {
            const msg = fehler instanceof Error ? fehler.message : String(fehler)
            return {
              content: [
                {
                  type: 'text',
                  text: `Error reading resources from collection "${collectionSlug}": ${msg}`,
                },
              ],
            }
          }
        },
      )
    }

    if (rechte.create) {
      const createShape = z.object({
        ...feldSchema.shape,
        depth: z
          .number()
          .int()
          .min(0)
          .max(10)
          .optional()
          .default(0)
          .describe('How many levels deep to populate relationships in response'),
        draft: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether to create the document as a draft'),
        select: z
          .string()
          .optional()
          .describe('Optional: define exactly which fields to return in the response (JSON)'),
      })

      server.registerTool(
        `create${suffix}`,
        {
          description: beschreibung || 'Create a document in a collection.',
          inputSchema: createShape.shape,
        },
        async (params: Record<string, unknown>) => {
          const { depth = 0, draft = false, select, ...rohDaten } = params
          try {
            let selectKlausel: Record<string, boolean> | undefined
            if (typeof select === 'string' && select) {
              try {
                selectKlausel = JSON.parse(select) as Record<string, boolean>
              } catch {
                return { content: [{ type: 'text', text: 'Error: Invalid JSON in select clause' }] }
              }
            }
            const daten = entferneVirtuelleFelder(rohDaten, virtuell)
            const ergebnis = await payload.create({
              collection: collectionSlug,
              data: daten as never,
              depth: Number(depth),
              draft: Boolean(draft),
              ...(selectKlausel && { select: selectKlausel }),
              overrideAccess: false,
              req,
              user,
            })
            return {
              content: [
                {
                  type: 'text',
                  text: `Resource created successfully in collection "${collectionSlug}"!\nCreated resource:\n\`\`\`json\n${JSON.stringify(ergebnis)}\n\`\`\``,
                },
              ],
            }
          } catch (fehler) {
            const msg = fehler instanceof Error ? fehler.message : String(fehler)
            return {
              content: [
                {
                  type: 'text',
                  text: `Error creating resource in collection "${collectionSlug}": ${msg}`,
                },
              ],
            }
          }
        },
      )
    }

    if (rechte.update) {
      const updateShape = z.object({
        ...feldSchema.partial().shape,
        id: z
          .union([z.string(), z.number()])
          .optional()
          .describe('The ID of the document to update'),
        depth: z
          .number()
          .optional()
          .default(0)
          .describe('How many levels deep to populate relationships'),
        draft: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether to update the document as a draft'),
        overrideLock: z
          .boolean()
          .optional()
          .default(true)
          .describe('Whether to override document locks'),
        select: z
          .string()
          .optional()
          .describe('Optional: define exactly which fields to return in the response (JSON)'),
        where: z
          .string()
          .optional()
          .describe('JSON string for where clause to update multiple documents'),
      })

      server.registerTool(
        `update${suffix}`,
        {
          description: beschreibung || 'Update documents in a collection by ID or where clause.',
          inputSchema: updateShape.shape,
        },
        async (params: Record<string, unknown>) => {
          const {
            id,
            depth = 0,
            draft = false,
            overrideLock = true,
            select,
            where,
            ...rohDaten
          } = params
          if (id === undefined && !where) {
            return {
              content: [
                { type: 'text', text: 'Error: Either id or where clause must be provided' },
              ],
            }
          }
          try {
            let selectKlausel: Record<string, boolean> | undefined
            if (typeof select === 'string' && select) {
              try {
                selectKlausel = JSON.parse(select) as Record<string, boolean>
              } catch {
                return { content: [{ type: 'text', text: 'Error: Invalid JSON in select clause' }] }
              }
            }
            const daten = entferneVirtuelleFelder(rohDaten, virtuell)

            if (id !== undefined) {
              const ergebnis = await payload.update({
                id: id as number | string,
                collection: collectionSlug,
                data: daten as never,
                depth: Number(depth),
                draft: Boolean(draft),
                overrideAccess: false,
                overrideLock: Boolean(overrideLock),
                ...(selectKlausel && { select: selectKlausel }),
                req,
                user,
              })
              return {
                content: [
                  {
                    type: 'text',
                    text: `Document updated successfully in collection "${collectionSlug}"!\nUpdated document:\n\`\`\`json\n${JSON.stringify(ergebnis)}\n\`\`\``,
                  },
                ],
              }
            }

            let whereKlausel: Where
            try {
              whereKlausel = JSON.parse(String(where)) as Where
            } catch {
              return { content: [{ type: 'text', text: 'Error: Invalid JSON in where clause' }] }
            }

            const ergebnis = await payload.update({
              collection: collectionSlug,
              data: daten as never,
              depth: Number(depth),
              draft: Boolean(draft),
              overrideAccess: false,
              overrideLock: Boolean(overrideLock),
              ...(selectKlausel && { select: selectKlausel }),
              req,
              user,
              where: whereKlausel,
            })
            return {
              content: [
                {
                  type: 'text',
                  text: `Multiple documents updated in collection "${collectionSlug}"!\nUpdated: ${ergebnis.docs.length} documents\n\`\`\`json\n${JSON.stringify(ergebnis.docs)}\n\`\`\``,
                },
              ],
            }
          } catch (fehler) {
            const msg = fehler instanceof Error ? fehler.message : String(fehler)
            return {
              content: [
                {
                  type: 'text',
                  text: `Error updating resource in collection "${collectionSlug}": ${msg}`,
                },
              ],
            }
          }
        },
      )
    }

    if (rechte.delete) {
      server.registerTool(
        `delete${suffix}`,
        {
          description: beschreibung || 'Delete documents in a collection by ID or where clause.',
          inputSchema: {
            id: z
              .union([z.string(), z.number()])
              .optional()
              .describe('Optional: specific document ID to delete'),
            depth: z
              .number()
              .int()
              .min(0)
              .max(10)
              .optional()
              .default(0)
              .describe('Depth of population for relationships in response'),
            where: z
              .string()
              .optional()
              .describe('Optional: JSON string for where clause to delete multiple documents'),
          },
        },
        async (params: { id?: number | string; depth?: number; where?: string }) => {
          const { id, depth = 0, where } = params
          if (id === undefined && !where) {
            return {
              content: [
                { type: 'text', text: 'Error: Either id or where clause must be provided' },
              ],
            }
          }
          try {
            if (id !== undefined) {
              const ergebnis = await payload.delete({
                id,
                collection: collectionSlug,
                depth,
                overrideAccess: false,
                req,
                user,
              })
              return {
                content: [
                  {
                    type: 'text',
                    text: `Document deleted successfully from collection "${collectionSlug}"!\nDeleted document:\n\`\`\`json\n${JSON.stringify(ergebnis)}\n\`\`\``,
                  },
                ],
              }
            }

            let whereKlausel: Where
            try {
              whereKlausel = JSON.parse(String(where)) as Where
            } catch {
              return { content: [{ type: 'text', text: 'Error: Invalid JSON in where clause' }] }
            }

            const ergebnis = await payload.delete({
              collection: collectionSlug,
              depth,
              overrideAccess: false,
              req,
              user,
              where: whereKlausel,
            })
            return {
              content: [
                {
                  type: 'text',
                  text: `Document deleted successfully from collection "${collectionSlug}"!\nDeleted: ${ergebnis.docs.length} documents\n\`\`\`json\n${JSON.stringify(ergebnis.docs)}\n\`\`\``,
                },
              ],
            }
          } catch (fehler) {
            const msg = fehler instanceof Error ? fehler.message : String(fehler)
            return {
              content: [
                {
                  type: 'text',
                  text: `Error deleting resource from collection "${collectionSlug}": ${msg}`,
                },
              ],
            }
          }
        },
      )
    }
  }

  for (const [slug, konfig] of Object.entries(optionen.globals)) {
    if (!konfig?.enabled) continue
    const globalSlug = slug as GlobalSlug
    const rechte = berechtigungen.zugriffe[toCamelCase(globalSlug)]
    if (!rechte) continue

    const globalKonfig = payload.config.globals.find((g) => g.slug === globalSlug)
    const virtuell = globalKonfig ? virtuelleFelder(globalKonfig.fields) : []
    const rohesSchema = (configSchema.definitions?.[globalSlug] ?? {}) as JsonSchemaKnoten
    if (rohesSchema.properties) {
      for (const name of virtuell) delete rohesSchema.properties[name]
    }
    const feldSchema = jsonSchemaZuZodObjekt(rohesSchema)
    const suffix = toolSuffix(globalSlug)
    const zusatz = konfig.description ? `\n\n${konfig.description}` : ''

    if (rechte.find) {
      server.registerTool(
        `find${suffix}`,
        {
          description: `Find a Payload global singleton configuration.${zusatz}`,
          inputSchema: {
            depth: z
              .number()
              .int()
              .min(0)
              .max(10)
              .optional()
              .default(0)
              .describe('Depth of population for relationships'),
            select: z
              .string()
              .optional()
              .describe('Optional: define exactly which fields to return in the response (JSON)'),
          },
        },
        async (params: { depth?: number; select?: string }) => {
          const { depth = 0, select } = params
          try {
            let selectKlausel: Record<string, boolean> | undefined
            if (select) {
              try {
                selectKlausel = JSON.parse(select) as Record<string, boolean>
              } catch {
                return { content: [{ type: 'text', text: 'Error: Invalid JSON in select clause' }] }
              }
            }
            const ergebnis = await payload.findGlobal({
              slug: globalSlug,
              depth,
              ...(selectKlausel && { select: selectKlausel as never }),
              overrideAccess: false,
              req,
              user,
            })
            return {
              content: [
                {
                  type: 'text',
                  text: `Global "${globalSlug}":\n\`\`\`json\n${JSON.stringify(ergebnis)}\n\`\`\``,
                },
              ],
            }
          } catch (fehler) {
            const msg = fehler instanceof Error ? fehler.message : String(fehler)
            return {
              content: [{ type: 'text', text: `Error reading global "${globalSlug}": ${msg}` }],
            }
          }
        },
      )
    }

    if (rechte.update) {
      const updateShape = z.object({
        ...feldSchema.partial().shape,
        depth: z
          .number()
          .optional()
          .default(0)
          .describe('Optional: Depth of relationships to populate'),
        draft: z.boolean().optional().default(false).describe('Optional: Whether to save as draft'),
        select: z
          .string()
          .optional()
          .describe('Optional: define exactly which fields to return in the response (JSON)'),
      })

      server.registerTool(
        `update${suffix}`,
        {
          description: `Update a Payload global singleton configuration.${zusatz}`,
          inputSchema: updateShape.shape,
        },
        async (params: Record<string, unknown>) => {
          const { depth = 0, draft = false, select, ...rohDaten } = params
          try {
            let selectKlausel: Record<string, boolean> | undefined
            if (typeof select === 'string' && select) {
              try {
                selectKlausel = JSON.parse(select) as Record<string, boolean>
              } catch {
                return { content: [{ type: 'text', text: 'Error: Invalid JSON in select clause' }] }
              }
            }
            const daten = entferneVirtuelleFelder(rohDaten, virtuell)
            const ergebnis = await payload.updateGlobal({
              slug: globalSlug,
              data: daten as never,
              depth: Number(depth),
              draft: Boolean(draft),
              ...(selectKlausel && { select: selectKlausel as never }),
              overrideAccess: false,
              req,
              user,
            })
            return {
              content: [
                {
                  type: 'text',
                  text: `Global "${globalSlug}" updated successfully!\n\`\`\`json\n${JSON.stringify(ergebnis)}\n\`\`\``,
                },
              ],
            }
          } catch (fehler) {
            const msg = fehler instanceof Error ? fehler.message : String(fehler)
            return {
              content: [{ type: 'text', text: `Error updating global "${globalSlug}": ${msg}` }],
            }
          }
        },
      )
    }
  }

  return server
}

export function erstelleWorkerMcpHandler(optionen: WorkerMcpOptionen): Endpoint['handler'] {
  const userCollection = optionen.userCollection ?? 'users'

  return async (req: PayloadRequest): Promise<Response> => {
    req.payloadAPI = 'MCP'
    const berechtigungen = await pruefeApiKey(req, userCollection)
    req.user = berechtigungen.user

    if ((req.method ?? 'GET').toUpperCase() !== 'POST') {
      return Response.json(
        {
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Method not allowed.' },
          id: null,
        },
        { status: 405, headers: { Allow: 'POST' } },
      )
    }

    const server = baueMcpServer(optionen, berechtigungen, req)
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })

    await server.connect(transport)

    const webReq = new Request(req.url ?? 'https://admin.titz.cooking/api/mcp', {
      method: 'POST',
      headers: req.headers,
      body: req.body,
      // @ts-expect-error -- RequestInit.duplex ist Teil des Fetch-Standards für ReadableStream-Bodies
      duplex: 'half',
    })

    return await transport.handleRequest(webReq)
  }
}

/**
 * Nachgelagertes Payload-Plugin (`order: 20`), das die von `@payloadcms/plugin-mcp`
 * (`order: 10`) registrierten `/mcp`-Endpunkte durch den Worker-kompatiblen
 * Handler ersetzt. Die Collection `payload-mcp-api-keys` bleibt unverändert.
 */
export const workerMcpEndpointPlugin = (optionen: WorkerMcpOptionen): Plugin => {
  const plugin: Plugin = (config: Config): Config => {
    const handler = erstelleWorkerMcpHandler({
      ...optionen,
      userCollection:
        optionen.userCollection ?? (config.admin?.user as CollectionSlug | undefined) ?? 'users',
    })
    const uebrigeEndpoints = (config.endpoints ?? []).filter((ep) => ep.path !== '/mcp')
    return {
      ...config,
      endpoints: [
        ...uebrigeEndpoints,
        { path: '/mcp', method: 'post', handler },
        { path: '/mcp', method: 'get', handler },
      ],
    }
  }
  plugin.order = 20
  return plugin
}
