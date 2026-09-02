/**
 * Hebt die Anzahl sichtbarer Aktuelles-Einträge auf der Startseite.
 *
 *   cd apps/cms
 *   NODE_ENV=production PAYLOAD_SECRET=ignore NEWS_LIMIT=10 NEWS_LIMIT_APPLY=1 \
 *     npx payload run scripts/setzeNewsLimit.ts
 *
 * Der Block `newsSection` schneidet die Liste in
 * `apps/web/src/components/sections/News.astro` auf `block.limit ?? 4` zu. Auf
 * der Startseite war kein Wert gesetzt, es erschienen also vier Einträge. Nach
 * dem Import über `importNews.ts` stehen zehn im CMS — und weil es keine eigene
 * Aktuelles-Seite gibt (die Navigation springt auf den Abschnitt der
 * Startseite), wären sechs davon für Besucher unsichtbar gewesen.
 *
 * Der Wert bleibt ein Feld im Admin: Wer den Abschnitt kürzer haben will, setzt
 * ihn dort, ohne dieses Skript.
 */
import { getPayload } from 'payload'
import config from '@payload-config'

const APPLY = process.env.NEWS_LIMIT_APPLY === '1'
const ZIEL = Number(process.env.NEWS_LIMIT ?? 10)

const payload = await getPayload({ config })

const seiten = await payload.find({ collection: 'pages', limit: 100, depth: 0 })

for (const seite of seiten.docs) {
  const sektionen = seite.sections
  if (!Array.isArray(sektionen)) continue

  let geaendert = false

  for (const block of sektionen) {
    const b = block as { blockType?: string; limit?: number | null }
    if (b.blockType !== 'newsSection') continue

    console.log(
      `  ${APPLY ? 'setzen ' : 'würde  '}  Seite «${seite.slug}» · limit ${b.limit ?? '(nicht gesetzt → 4)'} → ${ZIEL}`,
    )
    b.limit = ZIEL
    geaendert = true
  }

  if (geaendert && APPLY) {
    await payload.update({
      collection: 'pages',
      id: seite.id,
      data: { sections: sektionen },
    })
  }
}

if (!APPLY) console.log('\nNichts geschrieben (NEWS_LIMIT_APPLY=1 zum Schreiben).')

// Kein process.exit(): Der afterChange-Hook aus `hooks/rebuildWeb.ts` setzt
// seinen Fetch an den Deploy-Hook im Hintergrund ab. Ein sofortiges Beenden
// bricht ihn ab — genau das passierte bei den ersten Läufen von
// `importNews.ts`, und der Frontend-Build blieb aus.
