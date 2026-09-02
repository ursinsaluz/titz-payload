/**
 * Ersetzt «Co-Autor» in der Rössli-Station durch die belegbare Formulierung.
 *
 *   cd apps/cms
 *   NODE_ENV=production PAYLOAD_SECRET=ignore BUCHROLLE_APPLY=1 \
 *     npx payload run scripts/korrigiereBuchrolle.ts
 *
 * **Warum dieses Skript nicht ohne Rückfrage läuft.** Auf titz.cooking stand
 * «Co-Autor «Avantgardistische Naturküche» (2011)». Die Katalogdaten zu
 * ISBN 978-3-03800-532-2 nennen als Urheber Stefan Wiesner, Andrin C. Willi
 * (Text), Michael Wissing (Fotografie) und Anton Studer — Sebastian Titz ist
 * dort nicht geführt. Auch die Rechercheliste, aus der die Angabe stammt,
 * schreibt an einer Stelle nur «Rezeptentwickler».
 *
 * Bibliografische Urheberschaft ist eine überprüfbare Behauptung, und diese
 * hält der Prüfung nicht stand. Möglich ist aber, dass er im Buch selbst als
 * Mitwirkender genannt wird — das steht in keinem Katalog und lässt sich von
 * aussen nicht klären. Darum entscheidet das nicht ein Skript, sondern er:
 * Wer das Buch in der Hand hat, sieht in einer Minute, was drinsteht.
 *
 * Die neue Formulierung nimmt nichts weg. Zwei Jahre Rezeptentwicklung und die
 * fotografische Dokumentation für ein 272-seitiges Standardwerk sind eine
 * stärkere Aussage als ein Titel, den der Katalog nicht deckt.
 */
import { getPayload } from 'payload'
import config from '@payload-config'

const APPLY = process.env.BUCHROLLE_APPLY === '1'

const ALT = 'Co-Autor «Avantgardistische Naturküche» (2011)'
const NEU = 'Rezeptentwicklung und Fotodokumentation für «Avantgardistische Naturküche» (2011)'

const payload = await getPayload({ config })

const stationen = await payload.find({ collection: 'stationen', limit: 100, depth: 0 })

let gefunden = 0

for (const station of stationen.docs) {
  if (typeof station.description !== 'string' || !station.description.includes(ALT)) continue

  console.log(`  ${APPLY ? 'ändern ' : 'würde  '}  ${station.period} · ${station.title}`)
  console.log(`             ${station.description}`)
  console.log(`          →  ${station.description.replace(ALT, NEU)}`)
  gefunden++

  if (APPLY) {
    await payload.update({
      collection: 'stationen',
      id: station.id,
      data: { description: station.description.replace(ALT, NEU) },
    })
  }
}

console.log(`\n${gefunden} Stelle(n) betroffen.`)
if (!APPLY) console.log('Nichts geschrieben (BUCHROLLE_APPLY=1 zum Schreiben).')

process.exit(0)
