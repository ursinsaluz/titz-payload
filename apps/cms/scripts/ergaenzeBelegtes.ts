/**
 * Trägt nach, was Sebastian am 02.09.2026 bestätigt oder belegt hat.
 *
 *   cd apps/cms
 *   NODE_ENV=production PAYLOAD_SECRET=ignore BELEGT_APPLY=1 \
 *     npx payload run scripts/ergaenzeBelegtes.ts
 *
 * Vier Punkte, die beim Fact-Check offen blieben und jetzt geklärt sind:
 *
 * 1. **Rössli-Rolle.** Die Station nannte nur «Mit Natur-Alchemist Stefan
 *    Wiesner» — die Quellen widersprachen sich (sein Soil-to-Soul-Profil sagte
 *    Sous-Chef, vilan24 acht Jahre Küchenchef). Bestätigt: Küchenchef, sieben
 *    Jahre.
 *
 * 2. **Co-Autor bleibt.** Die Katalogdaten zu ISBN 978-3-03800-532-2 führen
 *    Titz nicht, das Cover nennt nur Stefan Wiesner. Er ist aber Co-Autor —
 *    eine Mitwirkung, die in keinem Katalogdatensatz auftaucht. Die Angabe auf
 *    der Seite bleibt also unverändert; `korrigiereBuchrolle.ts` ist gelöscht,
 *    damit niemand sie später «korrigiert».
 *
 * 3. **Falstaff Profi Award.** Mein erster Befund war unvollständig, nicht
 *    falsch: Bindella gewann «Bester Arbeitgeber **Gastronomie**», das Pinot
 *    die Kategorie «Beste Mitarbeitenden-Hospitality». Zwei Kategorien im
 *    selben Programm. Wörtlich in der Preisträgerliste des Falstaff-Berichts
 *    zum Launch vom 22.03.2026.
 *
 * 4. **Titelbild** zum Buch-Eintrag, aus der Rezension auf gourmoer.ch, von
 *    JPEG nach WebP gewandelt (126 → 29 KB). Auf Workers gibt es kein `sharp`,
 *    also keine Bildvarianten — die Grösse muss vor dem Upload stimmen.
 */
import fs from 'fs'
import { getPayload } from 'payload'
import config from '@payload-config'

const APPLY = process.env.BELEGT_APPLY === '1'
const COVER = '/tmp/wiesner_cover.webp'

const payload = await getPayload({ config })
const tat = APPLY ? '' : 'würde: '

// ── 1. Rössli: Rolle und Dauer ───────────────────────────────────────────
const roessli = await payload.find({
  collection: 'stationen',
  where: { title: { equals: 'Gasthof Rössli' } },
  limit: 1,
  depth: 0,
})

if (roessli.docs[0]) {
  const doc = roessli.docs[0]
  const neu =
    'Küchenchef, sieben Jahre bei Natur-Alchemist Stefan Wiesner; Co-Autor ' +
    '«Avantgardistische Naturküche» (2011) — 17 GaultMillau-Punkte, 1 Michelin-Stern'

  if (doc.description === neu) {
    console.log('  vorhanden: Rössli-Beschreibung')
  } else {
    console.log(`  ${tat}Rössli — «${neu}»`)
    if (APPLY) {
      await payload.update({
        collection: 'stationen',
        id: doc.id,
        data: { description: neu },
      })
    }
  }
}

// ── 2. Pinot-Station: den Arbeitgeber-Award dazu ──────────────────────────
const pinot = await payload.find({
  collection: 'stationen',
  where: { title: { equals: 'Restaurant Pinot' } },
  limit: 1,
  depth: 0,
})

if (pinot.docs[0]) {
  const doc = pinot.docs[0]
  const neu =
    'Küchenchef & Gastgeber, Klinik Gut — Bib Gourmand, Falstaff Guide 2026; ' +
    'Falstaff Profi Award 2026: Beste Mitarbeitenden-Hospitality'

  if (doc.description === neu) {
    console.log('  vorhanden: Pinot-Beschreibung')
  } else {
    console.log(`  ${tat}Pinot — «${neu}»`)
    if (APPLY) {
      await payload.update({
        collection: 'stationen',
        id: doc.id,
        data: { description: neu },
      })
    }
  }
}

// ── 3. Der Award als Aktuelles ────────────────────────────────────────────
const TITEL_AWARD = 'Falstaff Profi Award: Beste Mitarbeitenden-Hospitality'
const award = await payload.find({
  collection: 'news',
  where: { title: { equals: TITEL_AWARD } },
  limit: 1,
  depth: 0,
})

if (award.totalDocs > 0) {
  console.log('  vorhanden: Award-Eintrag')
} else {
  console.log(`  ${tat}Aktuelles — 2026-03-22 «${TITEL_AWARD}»`)
  if (APPLY) {
    await payload.create({
      collection: 'news',
      data: {
        title: TITEL_AWARD,
        date: '2026-03-22T00:00:00.000Z',
        excerpt:
          'Falstaff zeichnet das Pinot für das Wohl der Mitarbeitenden aus — ' +
          'die Auszeichnung, die Sebastian Titz’ Führungsverständnis betrifft, ' +
          'nicht den Teller: Leadership statt klassischer Hierarchien.',
        link: {
          label: 'Zur Preisträgerliste',
          url: 'https://www.falstaff.com/ch/news/die-branche-unter-sich-falstaff-profi-schweiz-feiert-premiere-im-mammertsberg',
        },
        _status: 'published',
      },
    })
  }
}

// ── 4. Titelbild an den Buch-Eintrag ──────────────────────────────────────
const buch = await payload.find({
  collection: 'news',
  where: { title: { like: 'Avantgardistische Naturküche' } },
  limit: 1,
  depth: 0,
})

if (!buch.docs[0]) {
  console.log('  ! Buch-Eintrag nicht gefunden')
} else if (buch.docs[0].image) {
  console.log('  vorhanden: Bild am Buch-Eintrag')
} else if (!fs.existsSync(COVER)) {
  console.log(`  ! ${COVER} fehlt — Titelbild übersprungen`)
} else {
  console.log(`  ${tat}Titelbild hochladen und an den Buch-Eintrag hängen`)

  if (APPLY) {
    const medium = await payload.create({
      collection: 'media',
      data: {
        alt: 'Buchcover «Avantgardistische Naturküche» von Stefan Wiesner, AT Verlag 2011',
        verwendung: 'web',
      },
      file: {
        // Ein echter Buffer, wie in `repairProd.ts`: Das Skript läuft gegen die
        // echten Bindings, nicht gegen miniflare. Payloads `probeImageSize`
        // braucht `readUInt32BE` — ein blankes Uint8Array bricht dort ab.
        data: fs.readFileSync(COVER),
        mimetype: 'image/webp',
        name: 'wiesner-avantgardistische-naturkueche.webp',
        size: fs.statSync(COVER).size,
      },
    })

    await payload.update({
      collection: 'news',
      id: buch.docs[0].id,
      data: { image: medium.id },
    })
    console.log(`             Medium id=${medium.id}, ${medium.width}×${medium.height}`)
  }
}

console.log(APPLY ? '\nGeschrieben.' : '\nNichts geschrieben (BELEGT_APPLY=1 zum Schreiben).')

// Kein process.exit(): Der afterChange-Hook aus `hooks/rebuildWeb.ts` setzt
// seinen Fetch im Hintergrund ab und würde abgebrochen. Lokal ist
// WEB_DEPLOY_HOOK_URL ohnehin leer — danach `pnpm run deploy:web`.
