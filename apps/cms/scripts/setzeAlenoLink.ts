/**
 * Setzt die Reservations-Links auf den Aleno-Buchungslink.
 *
 *   cd apps/cms
 *   NODE_ENV=production PAYLOAD_SECRET=ignore ALENO_APPLY=1 \
 *     npx payload run scripts/setzeAlenoLink.ts
 *
 * Ersetzt in `events/gourmetabend-im-pinot` und in der `visitSection` der
 * Startseite `cta.url` durch den Aleno-Reservationslink. Das Label und
 * `secondaryCta` bleiben unverändert.
 */
import { getPayload } from 'payload'
import config from '@payload-config'

const APPLY = process.env.ALENO_APPLY === '1'
const ALENO_URL =
  'https://mytools.aleno.me/reservations/v2.0/reservations.html?k=eyJrIjoid2l2dTVrM2lsNm15cnBiOWlwdzZ4bmViajhycnVkaWRpZ280bGZwODBsbzlhNGlweTEiLCJyIjoiNkJ5RnNmTFl0REFjY3NMeGgiLCJzIjoiaHR0cHM6Ly9teXRvb2xzLmFsZW5vLm1lLyJ9'

const payload = await getPayload({ config })

let gefunden = 0

const anlaesse = await payload.find({
  collection: 'events',
  where: { slug: { equals: 'gourmetabend-im-pinot' } },
  limit: 1,
  depth: 0,
})

const anlass = anlaesse.docs[0]
if (anlass && anlass.cta?.url !== ALENO_URL) {
  console.log(`  ${APPLY ? 'ändern ' : 'würde  '}  Anlass «${anlass.slug}» · cta.url`)
  console.log(`             ${anlass.cta?.url ?? '(leer)'}`)
  console.log(`          →  ${ALENO_URL}`)
  gefunden++

  if (APPLY) {
    await payload.update({
      collection: 'events',
      id: anlass.id,
      draft: false,
      data: {
        cta: {
          ...anlass.cta,
          url: ALENO_URL,
        },
        _status: 'published',
      },
    })
  }
}

const seiten = await payload.find({
  collection: 'pages',
  where: { slug: { equals: 'home' } },
  limit: 1,
  depth: 0,
})

const home = seiten.docs[0]
const sektionen = home?.sections
if (home && Array.isArray(sektionen)) {
  let geaendert = false

  for (const block of sektionen) {
    if (block.blockType !== 'visitSection') continue
    if (block.cta?.url === ALENO_URL) continue

    console.log(`  ${APPLY ? 'ändern ' : 'würde  '}  Seite «${home.slug}» · visitSection.cta.url`)
    console.log(`             ${block.cta?.url ?? '(leer)'}`)
    console.log(`          →  ${ALENO_URL}`)
    block.cta = {
      ...block.cta,
      url: ALENO_URL,
    }
    geaendert = true
    gefunden++
  }

  if (geaendert && APPLY) {
    await payload.update({
      collection: 'pages',
      id: home.id,
      draft: false,
      data: {
        sections: sektionen,
        _status: 'published',
      },
    })
  }
}

console.log(`\n${gefunden} Stelle(n) betroffen.`)
if (!APPLY) console.log('Nichts geschrieben (ALENO_APPLY=1 zum Schreiben).')

// Kein process.exit(): Der afterChange-Hook aus `hooks/rebuildWeb.ts` setzt
// seinen Fetch an den Deploy-Hook im Hintergrund ab.
