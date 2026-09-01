/**
 * Repariert die Dateien in Produktion, ohne den Inhalt anzufassen.
 *
 * Am 06.07.2026 wurde die Produktionsdatenbank befüllt, die Dateien landeten
 * aber im lokalen Miniflare-R2 statt im echten Bucket. Ergebnis: Jede
 * Bild- und Icon-Adresse auf titz.cooking antwortet mit 404, und die
 * Bild-Metadaten in D1 stehen auf `text/plain`, 11 Byte. Zusätzlich fehlen in
 * Produktion die acht UI-Icons (`menu`, `x`, `arrow-*`, `clock`, `mail`,
 * `map-pin`, `phone`), weil die Datenbank von einem älteren Seed stammt.
 *
 * Bewusst **kein** neuer Seed: Der würde alles überschreiben, was seit Juli im
 * Admin redaktionell geändert wurde — das Stage-Badge steht dort inzwischen auf
 * «15 GaultMillau», `content.json` sagt weiterhin «16». Dieses Skript
 * aktualisiert darum nur Dateien und Icon-Markup und lässt jedes andere Feld
 * unberührt. Die IDs bleiben erhalten, also auch alle Verknüpfungen aus News,
 * Seiten und Globals.
 *
 * Standardmässig wird nur berichtet. Geschrieben wird erst mit `REPAIR_APPLY=1`:
 *
 *   cd apps/cms
 *   NODE_ENV=production PAYLOAD_SECRET=ignore REPAIR_APPLY=1 \
 *     npx payload run scripts/repairProd.ts
 *
 * Eine Umgebungsvariable und kein Flag, weil `payload run` Argumente hinter dem
 * Skriptnamen nicht an dessen `process.argv` durchreicht: Ein `--apply` kam nie
 * an, das Skript berichtete bloss, und die Ausgabe sah nach Erfolg aus.
 *
 * NODE_ENV=production ist wichtig: nur dann verbindet die Konfiguration auf die
 * echten Bindings statt auf die lokale Kopie.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import config from '@payload-config'

import { MEDIEN, VEG_TOASTS, type MedienSchluessel } from '../src/seed/inhalte'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const iconsDir = path.resolve(dirname, '../src/seed/assets/icons')
const mediaDir = path.resolve(dirname, '../src/seed/assets/media')

const APPLY = process.env.REPAIR_APPLY === '1' || process.argv.includes('--apply')

/** miniflare's Binding-Proxy akzeptiert keine Node-Buffer — in echte Uint8Array umwandeln. */
const toUploadData = (buffer: Buffer): Buffer =>
  new Uint8Array(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  ) as unknown as Buffer

/**
 * Welches Bild zu welchem Datensatz.
 *
 * Zugeordnet über den Alt-Text, nicht über die ID: Der Alt-Text sagt, was das
 * Bild zeigen soll, und überlebt eine neu aufgesetzte Datenbank. Eine harte ID
 * würde beim nächsten Seed auf ein anderes Dokument zeigen.
 */
const MEDIA_ZUORDNUNG: Record<string, MedienSchluessel> = {
  Instagram: 'instagram',
  'Sebastian Titz': 'portrait',
  'Falstaff — Restaurants & Beizen Guide 2026': 'pinotTisch',
  'Was kochst du?! — Gespräch unter Chefs': 'kuecheFinish',
  'Mit Leidenschaft kochen — Porträt': 'anrichten',
  'Bib Gourmand für das Restaurant Pinot': 'pinotTeller',
}

async function main() {
  const payload = await getPayload({ config })
  const log = payload.logger

  log.info(APPLY ? '=== SCHREIBMODUS ===' : '=== Nur Bericht (REPAIR_APPLY=1 zum Schreiben) ===')

  // ---------------------------------------------------------------- Icons ---
  const iconDateien = fs.readdirSync(iconsDir).filter((f) => f.endsWith('.svg'))
  const vorhandene = await payload.find({ collection: 'icons', limit: 500, pagination: false })
  const nachName = new Map(vorhandene.docs.map((doc) => [doc.name, doc]))

  let neu = 0
  let erneuert = 0
  for (const datei of iconDateien) {
    const name = datei.replace(/\.svg$/, '')
    const svg = fs.readFileSync(path.join(iconsDir, datei), 'utf-8').trim()
    const buffer = Buffer.from(svg, 'utf-8')
    const file = {
      data: toUploadData(buffer),
      name: datei,
      mimetype: 'image/svg+xml',
      size: buffer.length,
    }
    const bestehend = nachName.get(name)

    if (!bestehend) {
      neu++
      log.info(`  + Icon «${name}» fehlt in Produktion`)
      if (APPLY) {
        await payload.create({
          collection: 'icons',
          data: { name, svg, toasts: (VEG_TOASTS[name] ?? []).map((text) => ({ text })) },
          file,
        })
      }
      continue
    }

    // Die Datei neu hochladen. Das `svg`-Feld wird mitgeschrieben, weil das
    // Frontend daraus rendert — die Toasts bleiben unangetastet, die sind
    // redaktionell.
    erneuert++
    if (APPLY) {
      await payload.update({ collection: 'icons', id: bestehend.id, data: { svg }, file })
    }
  }
  log.info(`Icons: ${neu} neu, ${erneuert} Datei erneuert (von ${iconDateien.length})`)

  // ---------------------------------------------------------------- Medien ---
  const medien = await payload.find({ collection: 'media', limit: 1000, pagination: false })
  let ersetzt = 0
  /**
   * Die Medienbibliothek ist inzwischen auf über 160 Bilder gewachsen, von denen
   * fast alle im Admin hochgeladen wurden und völlig in Ordnung sind. Eine
   * Warnzeile pro Stück machte die Ausgabe unlesbar und verdeckte genau die
   * Zeilen, auf die es ankommt — darum nur noch gezählt.
   */
  const ohneQuelle: number[] = []
  for (const doc of medien.docs) {
    const schluessel = MEDIA_ZUORDNUNG[doc.alt]
    if (!schluessel) {
      ohneQuelle.push(doc.id as number)
      continue
    }
    const { datei } = MEDIEN[schluessel]
    const buffer = fs.readFileSync(path.join(mediaDir, datei))
    log.info(`  ~ id=${doc.id} «${doc.alt}»: ${doc.filename} → ${datei}`)
    ersetzt++
    if (APPLY) {
      await payload.update({
        collection: 'media',
        id: doc.id,
        data: {},
        file: {
          data: toUploadData(buffer),
          name: datei,
          mimetype: datei.endsWith('.svg') ? 'image/svg+xml' : 'image/webp',
          size: buffer.length,
        },
      })
    }
  }
  log.info(
    `Bilder: ${ersetzt} ersetzt, ${ohneQuelle.length} ohne Quelle im Repo unangetastet ` +
      `(von ${medien.docs.length})`,
  )

  if (!APPLY) log.info('Nichts geschrieben. Mit REPAIR_APPLY=1 erneut ausführen.')
  process.exit(0)
}

try {
  await main()
} catch (fehler) {
  console.error(fehler)
  process.exit(1)
}
