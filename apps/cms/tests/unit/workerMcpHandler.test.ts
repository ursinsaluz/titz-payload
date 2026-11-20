import crypto from 'crypto'
import { describe, expect, it, vi } from 'vitest'
import { type PayloadRequest, sanitizeConfig, UnauthorizedError } from 'payload'
import { z } from 'zod'

import {
  bereinigeJsonSchema,
  erstelleWorkerMcpHandler,
  jsonSchemaZuZodObjekt,
  toCamelCase,
  workerMcpEndpointPlugin,
} from '../../src/mcp/workerMcpHandler'

describe('toCamelCase', () => {
  it('wandelt Bindestrich-Slugs in camelCase um', () => {
    expect(toCamelCase('signature-dishes')).toBe('signatureDishes')
    expect(toCamelCase('site-settings')).toBe('siteSettings')
    expect(toCamelCase('news')).toBe('news')
  })
})

describe('bereinigeJsonSchema & jsonSchemaZuZodObjekt', () => {
  it('entfernt interne Payload-Felder und vereinfacht $ref-Beziehungen', () => {
    const schema = bereinigeJsonSchema({
      type: 'object',
      required: ['id', 'title', 'createdAt', 'updatedAt'],
      properties: {
        id: { type: 'number' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
        title: { type: 'string' },
        image: {
          oneOf: [{ type: 'number' }, { $ref: '#/definitions/media' }],
        },
        tags: { type: ['array', 'null'], items: { type: 'string' } },
      },
    })

    expect(schema.properties?.id).toBeUndefined()
    expect(schema.properties?.createdAt).toBeUndefined()
    expect(schema.properties?.updatedAt).toBeUndefined()
    expect(schema.required).toEqual(['title'])
    expect(schema.properties?.image).toEqual({ type: 'number' })
    expect(schema.properties?.tags?.type).toBe('array')
  })

  it('erzeugt ein echtes ZodObject mit .partial() ohne eval/new Function', () => {
    const zodObj = jsonSchemaZuZodObjekt({
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
        rhythmus: { type: 'string', enum: ['einmalig', 'woechentlich'] },
        badge: { type: ['string', 'null'] },
        menu: {
          type: 'array',
          items: {
            type: 'object',
            required: ['text'],
            properties: { text: { type: 'string' } },
          },
        },
      },
    })

    expect(zodObj).toBeInstanceOf(z.ZodObject)
    expect(typeof zodObj.partial).toBe('function')
    expect(zodObj.parse({ title: 'Gourmetabend', rhythmus: 'woechentlich', badge: null })).toEqual({
      title: 'Gourmetabend',
      rhythmus: 'woechentlich',
      badge: null,
    })
    expect(zodObj.partial().parse({ badge: 'Neu' })).toEqual({ badge: 'Neu' })
  })
})

describe('erstelleWorkerMcpHandler', () => {
  const secret = 'test-secret-123'
  const apiKey = 'valid-mcp-key'
  const expectedIndex = crypto.createHmac('sha256', secret).update(apiKey).digest('hex')

  async function baueReq(
    body: unknown,
    authHeader?: string,
    method = 'POST',
  ): Promise<PayloadRequest> {
    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    })
    if (authHeader) headers.set('Authorization', authHeader)

    const rawReq = new Request('https://admin.titz.cooking/api/mcp', {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    })

    const config = await sanitizeConfig({
      secret,
      collections: [
        { slug: 'news', fields: [{ name: 'title', type: 'text', required: true }] },
        { slug: 'pages', fields: [{ name: 'title', type: 'text', required: true }] },
      ],
      globals: [{ slug: 'header', fields: [{ name: 'text', type: 'text' }] }],
      db: { defaultIDType: 'number' } as never,
    })

    const payload = {
      secret,
      db: { defaultIDType: 'number' },
      config,
      find: vi.fn(
        async ({ collection, where }: { collection: string; where?: Record<string, unknown> }) => {
          if (collection === 'payload-mcp-api-keys') {
            const index = (where?.apiKeyIndex as { equals?: string } | undefined)?.equals
            if (index !== expectedIndex) return { docs: [] }
            return {
              docs: [
                {
                  id: 2,
                  user: { id: 1, email: 'sebi@titz.cooking' },
                  news: { find: true, create: true, update: true, delete: false },
                  pages: { find: true, create: false, update: false, delete: false },
                  header: { find: true, update: false },
                },
              ],
            }
          }
          return { docs: [], totalDocs: 0, page: 1, totalPages: 1 }
        },
      ),
    }

    return Object.assign(rawReq, { payload }) as unknown as PayloadRequest
  }

  it('wirft UnauthorizedError ohne Authorization-Header', async () => {
    const handler = erstelleWorkerMcpHandler({
      collections: { news: { enabled: true } },
      globals: {},
    })
    const req = await baueReq({ jsonrpc: '2.0', id: 1, method: 'initialize' })
    await expect(handler(req)).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('beantwortet initialize und tools/list als reines JSON-RPC', async () => {
    const handler = erstelleWorkerMcpHandler({
      collections: {
        news: { enabled: true, description: 'Aktuelles' },
        pages: { enabled: true, description: 'Seiten' },
      },
      globals: {
        header: { enabled: true, description: 'Header' },
      },
    })

    const initResp = await handler(
      await baueReq(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'test', version: '1' },
          },
        },
        `Bearer ${apiKey}`,
      ),
    )

    expect(initResp.status).toBe(200)
    expect(initResp.headers.get('content-type')).toContain('application/json')
    const initJson = (await initResp.json()) as {
      result: { protocolVersion: string; serverInfo: { name: string } }
    }
    expect(initJson.result.protocolVersion).toBe('2025-06-18')
    expect(initJson.result.serverInfo.name).toBe('Payload MCP Server')

    const listResp = await handler(
      await baueReq(
        { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
        `Bearer ${apiKey}`,
      ),
    )
    expect(listResp.status).toBe(200)
    const listJson = (await listResp.json()) as { result: { tools: Array<{ name: string }> } }
    const namen = listJson.result.tools.map((t) => t.name).sort()
    expect(namen).toEqual(['createNews', 'findHeader', 'findNews', 'findPages', 'updateNews'])
  })

  it('ersetzt bestehende /mcp-Endpunkte im Plugin', () => {
    const dummyHandler = vi.fn()
    const plugin = workerMcpEndpointPlugin({ collections: {}, globals: {} })
    const result = plugin({
      endpoints: [
        { path: '/mcp', method: 'post', handler: dummyHandler },
        { path: '/mcp', method: 'get', handler: dummyHandler },
        { path: '/health', method: 'get', handler: dummyHandler },
      ],
    } as never) as { endpoints: Array<{ path: string; method: string; handler: unknown }> }

    expect(result.endpoints).toHaveLength(3)
    expect(
      result.endpoints.filter((e) => e.path === '/mcp').every((e) => e.handler !== dummyHandler),
    ).toBe(true)
    expect(result.endpoints.find((e) => e.path === '/health')?.handler).toBe(dummyHandler)
  })
})
