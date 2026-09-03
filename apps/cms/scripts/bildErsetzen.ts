/**
 * Ersetzt eine zu grosse Bilddatei durch eine passend dimensionierte, ohne den
 * Datensatz neu anzulegen.
 *
 *   cd apps/cms
 *   NODE_ENV=production PAYLOAD_SECRET=ignore \
 *     BILD_ID=163 BILD_DATEI=/tmp/kochst.webp BILD_NAME=was-kochst-du-acht-haende.webp \
 *     BILD_APPLY=1 npx payload run scripts/bildErsetzen.ts
 *
 * Warum die ID und nicht ein neuer Upload: Alle Verweise aus News, Seiten und
 * Globals zeigen auf die ID. Ein neuer Datensatz hiesse, jeden Verweis
 * nachzuziehen — und einen davon zu vergessen.
 *
 * Der Dateiname ändert sich dabei, die URL also auch. Das ist beabsichtigt: Der
 * alte hiess «Was kochst du! 8 HANDS», mit Leerzeichen und ohne Endung. Ein
 * sprechender Dateiname ist ein kleines, kostenloses Signal für die Bildsuche.
 *
 * Auf Workers gibt es kein `sharp`, also keine Bildvarianten: Was hier
 * hochgeladen wird, wird genau so ausgeliefert. Die Grösse muss darum **vor**
 * dem Upload stimmen und sich an der Darstellung orientieren, nicht am Original.
 */
import fs from 'fs'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * «34% kleiner» oder «84% grösser» — mit Vorzeichen in die richtige Richtung.
 *
 * Vorher stand hier `100 - (neu * 100 / alt)` und das Wort «kleiner» fest im
 * Text. Bei einer Datei, die wächst, wurde daraus «-85% kleiner»: eine
 * Verdopplung, die wie eine Halbierung aussah. Am 03.09.2026 sind so drei
 * AVIF-Dateien durch grössere WebP ersetzt worden, und die Ausgabe meldete
 * jedes Mal einen Gewinn.
 *
 * Grösser ist hier übrigens richtig — WebP komprimiert schlechter als AVIF,
 * dafür kann Cloudflare es am Rand verkleinern. Was zählt, ist die
 * ausgelieferte Grösse, nicht die im Archiv. Die Meldung soll das nur nicht
 * verschleiern.
 */
function aenderung(alt: number, neu: number): string {
  if (!alt) return ''
  const prozent = Math.round(((neu - alt) / alt) * 100)
  if (prozent === 0) return '(gleich gross)'
  return prozent > 0 ? `(${prozent}% grösser)` : `(${-prozent}% kleiner)`
}

const APPLY = process.env.BILD_APPLY === '1'
const ID = Number(process.env.BILD_ID)
const DATEI = process.env.BILD_DATEI ?? ''
const NAME = process.env.BILD_NAME ?? ''

if (!ID || !DATEI || !NAME) {
  console.error('BILD_ID, BILD_DATEI und BILD_NAME werden alle drei gebraucht.')
} else if (!fs.existsSync(DATEI)) {
  console.error(`${DATEI} existiert nicht.`)
} else {
  const payload = await getPayload({ config })
  const vorher = await payload.findByID({ collection: 'media', id: ID, depth: 0 })

  const neuGross = fs.statSync(DATEI).size
  const altGross = vorher.filesize ?? 0

  console.log(`  vorher: ${vorher.filename}`)
  console.log(
    `          ${(altGross / 1024).toFixed(0)} KB · ${vorher.mimeType} · ${vorher.width}×${vorher.height}`,
  )
  console.log(`  ${APPLY ? 'nachher' : 'würde  '}: ${NAME}`)
  console.log(`          ${(neuGross / 1024).toFixed(0)} KB  ${aenderung(altGross, neuGross)}`)

  if (APPLY) {
    const nachher = await payload.update({
      collection: 'media',
      id: ID,
      data: {},
      file: {
        // Ein echter Buffer, nicht Uint8Array: Das Skript läuft gegen die
        // echten Bindings, und Payloads `probeImageSize` braucht `readUInt32BE`.
        data: fs.readFileSync(DATEI),
        mimetype: 'image/webp',
        name: NAME,
        size: neuGross,
      },
    })
    console.log(`          ${nachher.width}×${nachher.height} · ${nachher.url}`)
  } else {
    console.log('\n  Nichts geschrieben (BILD_APPLY=1 zum Schreiben).')
  }
}

// Kein process.exit(): Der Rebuild-Hook setzt seinen Fetch im Hintergrund ab.
