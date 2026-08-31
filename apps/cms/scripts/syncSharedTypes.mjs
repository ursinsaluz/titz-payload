/**
 * Kopiert die von Payload erzeugten Typen nach `packages/types`, damit auch
 * `apps/web` sie benutzen kann.
 *
 * Warum kopieren und nicht direkt dorthin generieren: Payload hängt an
 * `payload-types.ts` einen `declare module 'payload'`-Block, der die Typen des
 * Pakets `payload` erweitert. In `apps/web` gibt es dieses Paket nicht, und ein
 * nicht auflösbares `declare module` kippt dort von «Augmentierung» in
 * «Deklaration eines neuen Moduls» — je nach Auflösung mal so, mal so. Der
 * Block gehört ins CMS und nur dorthin, darum fliegt er beim Kopieren raus.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const quelle = path.resolve(dirname, '../src/payload-types.ts')
const ziel = path.resolve(dirname, '../../../packages/types/src/payload.ts')

const inhalt = fs.readFileSync(quelle, 'utf-8')

// Der Block steht am Dateiende und ist der einzige `declare module` darin.
const start = inhalt.indexOf("declare module 'payload'")
if (start === -1) {
  throw new Error(
    `Kein "declare module 'payload'" in ${quelle} gefunden — hat Payload das Format geändert?`,
  )
}

const kopf = `/* Erzeugt aus apps/cms/src/payload-types.ts — nicht von Hand bearbeiten.
   Neu erzeugen mit \`pnpm generate:types\` im Repo-Root. */
`

fs.mkdirSync(path.dirname(ziel), { recursive: true })
fs.writeFileSync(ziel, kopf + inhalt.slice(0, start).trimEnd() + '\n')
console.log(`Typen kopiert nach ${path.relative(process.cwd(), ziel)}`)
