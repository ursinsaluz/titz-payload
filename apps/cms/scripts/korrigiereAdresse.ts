/**
 * Korrigiert die Hausnummer des Restaurants auf der Startseite.
 *
 *   cd apps/cms
 *   NODE_ENV=production PAYLOAD_SECRET=ignore ADRESSE_APPLY=1 \
 *     npx payload run scripts/korrigiereAdresse.ts
 *
 * Auf titz.cooking stand «Steigstrasse 14». Das Restaurant Pinot liegt an der
 * **Steigstrasse 12** — so steht es auf restaurant-pinot.ch und im
 * Telefonbucheintrag auf search.ch. Wer der Seite folgte, stand vor dem
 * falschen Haus.
 *
 * Angefasst wird nur `sections[].infos[]` auf der Startseite, wo die Adresse
 * unter dem Label «Adresse» zum Restaurant gehört. Die Adresse im Impressum
 * bleibt bewusst unberührt: Dort ist sie die Angabe zur verantwortlichen
 * Person, nicht zum Betrieb, und ob Sebastian privat an der 14 gemeldet ist,
 * lässt sich von aussen nicht entscheiden. Das gehört von ihm bestätigt.
 */
import { getPayload } from 'payload'
import config from '@payload-config'

const APPLY = process.env.ADRESSE_APPLY === '1'
const FALSCH = 'Steigstrasse 14'
const RICHTIG = 'Steigstrasse 12'

const payload = await getPayload({ config })

const seiten = await payload.find({ collection: 'pages', limit: 100, depth: 0 })

let gefunden = 0

for (const seite of seiten.docs) {
  const sektionen = seite.sections
  if (!Array.isArray(sektionen)) continue

  let geaendert = false

  for (const block of sektionen) {
    const infos = (block as { infos?: { label?: string | null; value?: string | null }[] }).infos
    if (!Array.isArray(infos)) continue

    for (const info of infos) {
      if (typeof info.value !== 'string' || !info.value.includes(FALSCH)) continue

      console.log(`  ${APPLY ? 'ändern ' : 'würde  '}  Seite «${seite.slug}» · ${info.label}`)
      console.log(`             ${info.value.replace(/\n/g, ' / ')}`)
      console.log(`          →  ${info.value.replace(FALSCH, RICHTIG).replace(/\n/g, ' / ')}`)
      info.value = info.value.replace(FALSCH, RICHTIG)
      geaendert = true
      gefunden++
    }
  }

  if (geaendert && APPLY) {
    await payload.update({
      collection: 'pages',
      id: seite.id,
      data: { sections: sektionen },
    })
  }
}

console.log(`\n${gefunden} Stelle(n) betroffen.`)
if (!APPLY) console.log('Nichts geschrieben (ADRESSE_APPLY=1 zum Schreiben).')

// Kein process.exit(): Der afterChange-Hook aus `hooks/rebuildWeb.ts` setzt
// seinen Fetch an den Deploy-Hook im Hintergrund ab. Ein sofortiges Beenden
// bricht ihn ab — beim ersten Lauf dieses Skripts blieb der Frontend-Build
// deshalb aus, obwohl in Produktion alles geschrieben war.
