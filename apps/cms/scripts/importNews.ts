/**
 * Trägt die recherchierten Medienberichte als «Aktuelles» nach und korrigiert
 * zwei bestehende Einträge.
 *
 * Standardmässig wird nur berichtet. Geschrieben wird erst mit
 * `NEWS_IMPORT_APPLY=1`:
 *
 *   cd apps/cms
 *   NODE_ENV=production PAYLOAD_SECRET=ignore NEWS_IMPORT_APPLY=1 \
 *     npx payload run scripts/importNews.ts
 *
 * Ohne `NODE_ENV=production` läuft es gegen die lokale Kopie. Die
 * Umgebungsvariable statt eines Flags aus demselben Grund wie bei
 * `repairProd.ts`: `payload run` reicht Argumente hinter dem Skriptnamen nicht
 * durch, ein `--apply` kam nie an und die Ausgabe sah trotzdem nach Erfolg aus.
 *
 * Das Skript ist idempotent: Es vergleicht über den Titel und legt nichts
 * doppelt an. Ein zweiter Lauf meldet überall «vorhanden».
 *
 * **Woher die Daten kommen.** Die Vorlage war eine Rechercheliste, deren
 * URL-Spalte aus verkürzten Platzhaltern bestand (`gaultmillau.ch/garden-party-2024`
 * und ähnlich). Keiner davon existiert — gemessen 404 bzw. gar keine Antwort.
 * Jede URL hier ist einzeln aufgelöst und mit HTTP 200 geprüft. Einträge, deren
 * Quelle sich nicht auffinden liess, fehlen bewusst; die Liste ist kürzer als
 * die Vorlage.
 *
 * Bei `datumQuelle: 'liste'` stammt das Datum aus der Rechercheliste und ist
 * nicht gegengeprüft — der Artikel selbst ist es. Wer eines davon am Original
 * verifiziert, streicht die Markierung.
 */
import { getPayload } from 'payload'
import config from '@payload-config'

const APPLY = process.env.NEWS_IMPORT_APPLY === '1'

type Eintrag = {
  title: string
  date: string
  excerpt: string
  link: { label: string; url: string }
  datumQuelle?: 'liste'
}

/**
 * Jeder Kurztext sagt, was Sebastian damit zu tun hat. Ein Eintrag wie
 * «GaultMillau Garden Party 2021» allein wäre auf einer persönlichen Seite eine
 * Notiz über einen Anlass, nicht über ihn.
 */
const NEU: Eintrag[] = [
  {
    title: '«Avantgardistische Naturküche» erscheint',
    date: '2011-11-25',
    excerpt:
      'Aus den Jahren im Gasthof Rössli: Sebastian Titz entwickelt über zwei Jahre die Rezepturen für Stefan Wiesners Standardwerk mit und dokumentiert sie fotografisch.',
    link: {
      label: 'Zur Rezension',
      url: 'https://gourmoer.ch/2011/11/25/kochbuch-stefan-wiesner-avantgardistische-naturkuche/',
    },
  },
  {
    title: 'Garden Party: Premiere der Kaviarwaffel',
    date: '2019-08-19',
    datumQuelle: 'liste',
    excerpt:
      'An der GaultMillau Garden Party stellt Sebastian Titz seine Waffel mit Eigelbcreme und Oona-Kaviar vor — der Gang, der dem «Verve» als Signature bleibt.',
    link: {
      label: 'Zum Bericht',
      url: 'https://www.gaultmillau.ch/starchefs/lachs-und-kaviar-made-switzerland',
    },
  },
  {
    title: 'Garden Party: Kaviar und Lachs aus den Schweizer Alpen',
    date: '2021-08-16',
    datumQuelle: 'liste',
    excerpt:
      'Zwei Jahre später fragen so viele Gäste nach der Waffel, dass Sebastian Titz sie erneut serviert — daneben Blumenkohl mit Oona-Kaviar.',
    link: {
      label: 'Zum Bericht',
      url: 'https://www.gaultmillau.ch/life-style/kaviar-lachs-luxus-aus-den-schweizer-alpen',
    },
  },
  {
    title: '«Die Gäste sollen geniessen, ohne zu bereuen»',
    date: '2022-09-22',
    datumQuelle: 'liste',
    excerpt:
      'Sebastian Titz im Gespräch mit GaultMillau über den Veggie Day, den Umgang mit Kohl und was von der Schule Stefan Wiesners geblieben ist.',
    link: {
      label: 'Zum Interview',
      url: 'https://www.gaultmillau.ch/starchefs/interview-mit-sebastian-titz-vom-verve-by-sven-uber-den-veggie-day-531999',
    },
  },
  {
    title: 'Der 15. GaultMillau-Punkt für «Verve by Sven»',
    date: '2023-09-25',
    excerpt:
      'GaultMillau hebt das «Verve» von 14 auf 15 Punkte und hebt Sebastian Titz’ Kaviarwaffel mit Nussbutter-Eigelbcreme eigens hervor.',
    link: {
      label: 'Zur Meldung',
      url: 'https://www.leaderdigital.ch/news/gaultmillau-punktgewinn-fuer-verve-by-sven-9893.html',
    },
  },
  {
    title: '«Tschüss Verve! Titz kocht in der Klinik Gut»',
    date: '2024-07-30',
    datumQuelle: 'liste',
    excerpt:
      'GaultMillau würdigt fünf Jahre in Bad Ragaz — 15 Punkte, ein Stern — und kündigt den Wechsel nach Fläsch an: schnörkellose Gerichte mit Wow-Effekt im Mund.',
    link: {
      label: 'Zum Bericht',
      url: 'https://www.gaultmillau.ch/starchefs/tschuss-verve-titz-kocht-in-der-klinik-gut-734991',
    },
  },
]

/**
 * Korrekturen an bestehenden Einträgen. Gefunden über den Titel, weil die IDs
 * lokal und in Produktion auseinandergehen.
 */
const KORREKTUREN: { suche: string; aenderung: Record<string, unknown>; grund: string }[] = [
  {
    suche: 'Mit Leidenschaft kochen',
    aenderung: { date: '2025-01-31T00:00:00.000Z' },
    grund:
      'Das Interview von Tobias Hüberli ist auf salz-pfeffer.ch mit 31.01.2025 datiert, im CMS stand 20.08.2025 — sieben Monate zu spät, der Eintrag stand dadurch an der falschen Stelle der Zeitleiste.',
  },
  {
    suche: 'Bib Gourmand',
    aenderung: {
      title: 'Bib Gourmand: das Pinot bestätigt zum sechsten Mal',
      excerpt:
        'Der Guide MICHELIN bestätigt dem Pinot den Bib Gourmand zum sechsten Mal in Folge — die erste Auszeichnung, die Sebastian Titz in Fläsch weiterträgt.',
    },
    grund:
      'Der Eintrag las sich als seine Auszeichnung. Das Pinot hält den Bib 2025 zum sechsten Mal in Folge, also seit rund 2020 und damit aus der Zeit von Roland Schmid; Titz’ Verdienst ist, dass er unter ihm gehalten wurde.',
  },
]

const payload = await getPayload({ config })

console.log(APPLY ? '── Schreibmodus ──' : '── Nur Bericht (NEWS_IMPORT_APPLY=1 zum Schreiben) ──')

let angelegt = 0
let vorhanden = 0

for (const eintrag of NEU) {
  const treffer = await payload.find({
    collection: 'news',
    where: { title: { equals: eintrag.title } },
    limit: 1,
    depth: 0,
  })

  if (treffer.totalDocs > 0) {
    console.log(`  vorhanden  ${eintrag.date}  ${eintrag.title}`)
    vorhanden++
    continue
  }

  const markierung = eintrag.datumQuelle === 'liste' ? ' (Datum ungeprüft)' : ''
  console.log(
    `  ${APPLY ? 'anlegen  ' : 'würde    '}  ${eintrag.date}  ${eintrag.title}${markierung}`,
  )

  if (APPLY) {
    await payload.create({
      collection: 'news',
      data: {
        title: eintrag.title,
        date: `${eintrag.date}T00:00:00.000Z`,
        excerpt: eintrag.excerpt,
        link: eintrag.link,
        _status: 'published',
      },
    })
    angelegt++
  }
}

console.log('')

for (const korrektur of KORREKTUREN) {
  const treffer = await payload.find({
    collection: 'news',
    where: { title: { like: korrektur.suche } },
    limit: 2,
    depth: 0,
  })

  if (treffer.totalDocs !== 1) {
    console.log(`  ! «${korrektur.suche}» passt auf ${treffer.totalDocs} Einträge — übersprungen`)
    continue
  }

  const doc = treffer.docs[0]
  console.log(`  ${APPLY ? 'ändern   ' : 'würde    '}  ${doc.title}`)
  console.log(`             ${korrektur.grund}`)

  if (APPLY) {
    await payload.update({
      collection: 'news',
      id: doc.id,
      data: { ...korrektur.aenderung, _status: 'published' },
    })
  }
}

console.log(`\n${angelegt} angelegt, ${vorhanden} schon vorhanden.`)
if (!APPLY) console.log('Nichts geschrieben.')

process.exit(0)
