import fs from 'fs'
import path from 'path'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import { CloudflareContext, getCloudflareContext } from '@opennextjs/cloudflare'
import { GetPlatformProxyOptions } from 'wrangler'
import { r2Storage } from '@payloadcms/storage-r2'
import { mcpPlugin } from '@payloadcms/plugin-mcp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Icons } from './collections/Icons'
import { Pages } from './collections/Pages'
import { News } from './collections/News'
import { Angebote } from './collections/Angebote'
import { SignatureDishes } from './collections/SignatureDishes'
import { Stationen } from './collections/Stationen'
import { Header } from './globals/Header'
import { Footer } from './globals/Footer'
import { SiteSettings } from './globals/SiteSettings'
import { mitRebuild } from './hooks/rebuildWeb'
import { cloudflareEmail } from './email/cloudflareEmail'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const realpath = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : undefined)

const isBuild = process.env.NEXT_PHASE === 'phase-production-build'
const isCLI = process.argv.some((value) => realpath(value).endsWith(path.join('payload', 'bin.js')))
const isProduction = process.env.NODE_ENV === 'production'

/**
 * `REMOTE_BINDINGS=true` hängt den lokalen Dev-Server an das echte D1 und R2
 * statt an die Kopie unter `.wrangler/` — der Weg, um Prod-Inhalt über MCP zu
 * bearbeiten, weil der MCP-Endpunkt nur im Node-Prozess läuft.
 *
 * Nur über `pnpm dev:remote` setzen. Damit schreibt die Entwicklung in die
 * Produktionsdatenbank.
 */
const useRemoteBindings = isProduction || process.env.REMOTE_BINDINGS === 'true'

const createLog =
  (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      fn(JSON.stringify({ level, msg: objOrMsg }))
      return
    }

    // Ein Error spreadet zu einem leeren Objekt: `name`, `message` und `stack`
    // sind nicht enumerierbar. Ohne diesen Zweig protokollierte der Logger
    // buchstäblich `{"level":"error"}` und warf damit die einzige Spur weg, die
    // es zu einem Fehlschlag gab — Payload verpackt Upload-Fehler in einen
    // generischen `FileUploadError` und legt die Ursache ausschliesslich hier
    // ab. Betrifft auch die Worker-Logs in Produktion.
    if (objOrMsg instanceof Error) {
      fn(
        JSON.stringify({
          level,
          msg: msg ?? objOrMsg.message,
          name: objOrMsg.name,
          stack: objOrMsg.stack,
          cause: objOrMsg.cause instanceof Error ? objOrMsg.cause.message : objOrMsg.cause,
        }),
      )
      return
    }

    fn(JSON.stringify({ level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg }))
  }

const cloudflareLogger = {
  level: process.env.PAYLOAD_LOG_LEVEL || 'info',
  trace: createLog('trace', console.debug),
  debug: createLog('debug', console.debug),
  info: createLog('info', console.log),
  warn: createLog('warn', console.warn),
  error: createLog('error', console.error),
  fatal: createLog('fatal', console.error),
  silent: () => {},
} as any // Use PayloadLogger type when it's exported

const cloudflare = isBuild
  ? ({ env: {} } as any)
  : isCLI || !isProduction
    ? await getCloudflareContextFromWrangler()
    : await getCloudflareContext({ async: true })

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    // Payload rendert `<html>` selbst. Browsererweiterungen hängen dort
    // Attribute an, bevor React hydriert — LanguageTool etwa
    // `data-lt-installed="true"` —, und React meldet das als
    // Hydration-Mismatch. Der Fehler liegt nicht im Code und lässt sich von
    // hier aus nicht abstellen; die Option ist Payloads Ausweg dafür und in
    // `alvier-payload` aus demselben Grund gesetzt.
    suppressHydrationWarning: true,
  },
  // `mitRebuild` hängt an allem, was auf titz.cooking sichtbar ist, einen Hook,
  // der den Frontend-Build anstösst — siehe hooks/rebuildWeb.ts.
  collections: [Users, Media, Icons, Pages, News, Angebote, SignatureDishes, Stationen].map(
    mitRebuild,
  ),
  globals: [Header, Footer, SiteSettings].map(mitRebuild),
  editor: lexicalEditor(),
  // Ohne Adapter verschickt Payload nichts und schreibt nur eine Warnung ins
  // Log — «Passwort vergessen» führte damit zu einer Bestätigung im Admin und
  // zu keiner Mail. Begründung für das Binding statt SMTP in
  // `src/email/cloudflareEmail.ts`.
  email: cloudflareEmail,
  // Das Frontend holt seinen Content ausschliesslich über REST. GraphQL war
  // damit toter Code im Worker-Bundle — inklusive Playground-Route. Abschalten
  // entfernt Schema-Aufbau und Routen; die Handler unter
  // `app/(payload)/api/graphql*` sind mitgelöscht.
  graphQL: {
    disable: true,
  },
  secret:
    (globalThis as any).PAYLOAD_SECRET ||
    cloudflare.env.PAYLOAD_SECRET ||
    process.env.PAYLOAD_SECRET ||
    'ignore-secret-during-build',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteD1Adapter({
    binding: cloudflare.env.D1,
    /**
     * Im Entwicklungsmodus schreibt der Adapter das Schema direkt aus der
     * Konfiguration in die Datenbank. Gegen die lokale Kopie ist das bequem;
     * gegen Produktion ist es falsch und gefährlich: Dort kommt das Schema aus
     * `src/migrations/`, der Push kollidiert damit — `index
     * payload_preferences_rels_order_idx already exists` — und im schlechteren
     * Fall verändert er das Prod-Schema hinter dem Rücken der Migrationen.
     *
     * Darum im Remote-Modus aus. Schemaänderungen für Produktion laufen weiter
     * ausschliesslich über `payload migrate:create` und `pnpm deploy:cms`.
     */
    push: !useRemoteBindings,
  }),
  logger: isProduction ? cloudflareLogger : undefined,
  plugins: [
    r2Storage({
      bucket: cloudflare.env.R2,
      collections: { media: true, icons: true },
    }),
    // Macht den Inhalt für MCP-Clients lesbar und schreibbar. Der Endpunkt liegt
    // auf `/api/mcp` und authentisiert über einen Schlüssel aus der Collection
    // `payload-mcp-api-keys` — anlegen im Admin unter «Einstellungen».
    //
    // `users` ist bewusst nicht freigegeben: Über die MCP-Tools liessen sich
    // sonst Konten anlegen und Passwörter setzen.
    mcpPlugin({
      collections: {
        pages: { enabled: true, description: 'Seiten mit Sektionen (Startseite, Impressum, …)' },
        news: { enabled: true, description: 'Aktuelles — Presse, Auszeichnungen, Beiträge' },
        angebote: { enabled: true, description: 'Angebote (Beratung, Catering)' },
        'signature-dishes': { enabled: true, description: 'Signature Dishes und Starter' },
        stationen: { enabled: true, description: 'Lebenslauf — Stationen, Skills, Ausbildung' },
        icons: { enabled: true, description: 'SVG-Icon-Bibliothek samt Toast-Sprüchen' },
        media: { enabled: true, description: 'Bilder' },
      },
      globals: {
        header: { enabled: true, description: 'Navigation, Logo und Stage/Hero' },
        footer: { enabled: true, description: 'Fusszeile, Kontakt, Social-Links' },
        'site-settings': { enabled: true, description: 'SEO-Defaults und Easter-Egg-Texte' },
      },
      overrideApiKeyCollection: (collection) => ({
        ...collection,
        labels: { singular: 'MCP-Schlüssel', plural: 'MCP-Schlüssel' },
        admin: { ...collection.admin, group: 'Einstellungen' },
      }),
    }),
  ],
})

// Adapted from https://github.com/opennextjs/opennextjs-cloudflare/blob/d00b3a13e42e65aad76fba41774815726422cc39/packages/cloudflare/src/api/cloudflare-context.ts#L328C36-L328C46
function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        environment: process.env.CLOUDFLARE_ENV,
        // `REMOTE_BINDINGS=true` hängt den lokalen Dev-Server an das echte D1
        // und R2 statt an die Kopie unter `.wrangler/`. Der Weg, um Prod-Inhalt
        // über MCP zu lesen und zu schreiben: Der MCP-Endpunkt des Plugins
        // funktioniert nur im Node-Prozess, nicht im Worker — also läuft der
        // Prozess lokal und die Daten kommen von remote.
        //
        // Damit schreibt die Entwicklung in die Produktionsdatenbank. Darum
        // ausschliesslich über `pnpm dev:cms:remote`, nie als Standard.
        remoteBindings: useRemoteBindings,
      } satisfies GetPlatformProxyOptions),
  )
}
