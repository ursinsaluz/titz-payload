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

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const realpath = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : undefined)

const isBuild = process.env.NEXT_PHASE === 'phase-production-build'
const isCLI = process.argv.some((value) => realpath(value).endsWith(path.join('payload', 'bin.js')))
const isProduction = process.env.NODE_ENV === 'production'

const createLog =
  (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      fn(JSON.stringify({ level, msg: objOrMsg }))
    } else {
      fn(JSON.stringify({ level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg }))
    }
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
  db: sqliteD1Adapter({ binding: cloudflare.env.D1 }),
  logger: isProduction ? cloudflareLogger : undefined,
  plugins: [
    r2Storage({
      bucket: cloudflare.env.R2,
      collections: { media: true, icons: true },
    }),
    // Macht den Inhalt für MCP-Clients lesbar und schreibbar. Der Endpunkt liegt
    // auf `/api/mcp` und authentisiert über einen Schlüssel aus der Collection
    // `payload-mcp-api-keys` — anlegen im Admin unter «System».
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
        admin: { ...collection.admin, group: 'System' },
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
        remoteBindings: isProduction,
      } satisfies GetPlatformProxyOptions),
  )
}
