/**
 * Legt die zwei eigenen Beiträge unter «Aktuelles» samt Mediendateien an:
 *
 * 1. «Viermal Fläscher Bio-Senf mit Adanks Biofarm» mit den vier einzelnen
 *    Etikettenbildern aus dem Druck-PDF (auf das Trimbox-Mass beschnitten und
 *    als WebP mit 1521 × 366 px abgelegt).
 * 2. «Kräutertour ums PINOT: Lorbeer, Rosmarin und Oregano» mit Vorschaubild
 *    und dem eingebetteten Rundgang-Video.
 *
 * Ausführen gegen Produktion:
 *
 *   cd apps/cms
 *   NODE_ENV=production PAYLOAD_SECRET=ignore ARTIKEL_APPLY=1 \
 *     npx payload run scripts/importArtikel.ts
 *
 * Idempotent: Sucht vorhandene Medien über `alt` und Beiträge über `title`.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { slugify } from '../src/fields/slugFeld'
import { toLexical } from '../src/seed/lexical'

const APPLY = process.env.ARTIKEL_APPLY === '1'
const IS_PROD = process.env.NODE_ENV === 'production' || process.env.REMOTE_BINDINGS === 'true'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const mediaDir = path.resolve(dirname, '../src/seed/assets/media')

/**
 * Miniflares lokaler R2-Proxy verlangt ein blankes `Uint8Array`, während
 * Payloads `probeImageSize` gegen die echten Bindings einen Node-`Buffer` mit
 * `readUInt32BE` braucht — siehe `repairProd.ts`.
 */
const toUploadData = (buffer: Buffer): Buffer =>
  IS_PROD
    ? buffer
    : (new Uint8Array(
        buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      ) as unknown as Buffer)

interface MediumVorlage {
  schluessel: string
  dateiPfad: string
  dateiName: string
  mimeType: string
  alt: string
  caption: string
}

const VIDEO_PFAD = fs.existsSync('/tmp/kraeuter-tour-sebastian-titz-pinot.mp4')
  ? '/tmp/kraeuter-tour-sebastian-titz-pinot.mp4'
  : '/Users/ursinsaluz/Downloads/WhatsApp Video 2026-10-16 at 22.22.44.mp4'

const MEDIEN_VORLAGEN: MediumVorlage[] = [
  {
    schluessel: 'gelbsenf',
    dateiPfad: path.join(mediaDir, 'adanks-biofarm-flaescher-gelbsenf.webp'),
    dateiName: 'adanks-biofarm-flaescher-gelbsenf.webp',
    mimeType: 'image/webp',
    alt: 'Etikette Fläscher Gelbsenf von Adanks Biofarm, hergestellt von Chefkoch Sebastian Titz',
    caption:
      'Fläscher Gelbsenf (100 g) — Essig, Birnell, Rapsöl, Senf aus eigenem Anbau, Rohrzucker und Salz.',
  },
  {
    schluessel: 'braunsenf',
    dateiPfad: path.join(mediaDir, 'adanks-biofarm-flaescher-braunsenf.webp'),
    dateiName: 'adanks-biofarm-flaescher-braunsenf.webp',
    mimeType: 'image/webp',
    alt: 'Etikette Fläscher Braunsenf von Adanks Biofarm, hergestellt von Chefkoch Sebastian Titz',
    caption: 'Fläscher Braunsenf (100 g) — kräftig und würzig aus dunkler Fläscher Bio-Senfsaat.',
  },
  {
    schluessel: 'knoblauchsenf',
    dateiPfad: path.join(mediaDir, 'adanks-biofarm-knoblauch-senf.webp'),
    dateiName: 'adanks-biofarm-knoblauch-senf.webp',
    mimeType: 'image/webp',
    alt: 'Etikette Knoblauch-Senf von Adanks Biofarm, hergestellt von Chefkoch Sebastian Titz',
    caption:
      'Knoblauch-Senf (100 g) — Senf und Knoblauch stammen beide aus eigenem biologischem Anbau in Fläsch.',
  },
  {
    schluessel: 'safransenf',
    dateiPfad: path.join(mediaDir, 'adanks-biofarm-safran-senf.webp'),
    dateiName: 'adanks-biofarm-safran-senf.webp',
    mimeType: 'image/webp',
    alt: 'Etikette Safran-Senf von Adanks Biofarm, hergestellt von Chefkoch Sebastian Titz',
    caption: 'Safran-Senf (100 g) — mit Fläscher Bio-Safran und Senf vom Hof der Familie Adank.',
  },
  {
    schluessel: 'kraeuterBild',
    dateiPfad: path.join(mediaDir, 'kraeuter-tour-sebastian-titz-pinot.webp'),
    dateiName: 'kraeuter-tour-sebastian-titz-pinot.webp',
    mimeType: 'image/webp',
    alt: 'Sebastian Titz bei der Kräutertour im Garten des Restaurant PINOT in Fläsch',
    caption: 'Kräutertour rund ums Restaurant PINOT in Fläsch.',
  },
  {
    schluessel: 'kraeuterVideo',
    dateiPfad: VIDEO_PFAD,
    dateiName: 'kraeuter-tour-sebastian-titz-pinot.mp4',
    mimeType: 'video/mp4',
    alt: 'Video: Kräutertour mit Sebastian Titz rund ums Restaurant PINOT in Fläsch',
    caption:
      'Unterwegs im Kräutergarten beim Restaurant PINOT: frischer Lorbeer, sonniger Rosmarin und mediterraner Oregano.',
  },
]

async function stelleMediumSicher(payload: Payload, vorlage: MediumVorlage): Promise<number> {
  const treffer = await payload.find({
    collection: 'media',
    where: { alt: { equals: vorlage.alt } },
    limit: 1,
    depth: 0,
  })

  if (treffer.docs[0]) {
    console.log(`  vorhanden  Medium #${treffer.docs[0].id}  ${vorlage.dateiName}`)
    return treffer.docs[0].id as number
  }

  if (!fs.existsSync(vorlage.dateiPfad)) {
    throw new Error(`Mediendatei fehlt: ${vorlage.dateiPfad}`)
  }

  const buffer = fs.readFileSync(vorlage.dateiPfad)
  console.log(
    `  ${APPLY ? 'hochladen' : 'würde    '}  ${vorlage.dateiName} (${(buffer.length / 1024).toFixed(0)} KB)`,
  )

  if (!APPLY) return -1

  const angelegt = await payload.create({
    collection: 'media',
    data: {
      alt: vorlage.alt,
      caption: vorlage.caption,
      kategorie: 'kueche',
      jahr: 2026,
      verwendung: 'web',
    },
    file: {
      data: toUploadData(buffer),
      name: vorlage.dateiName,
      mimetype: vorlage.mimeType,
      size: buffer.length,
    },
  })

  return angelegt.id as number
}

const payload = await getPayload({ config })
console.log(APPLY ? '── Schreibmodus ──\n' : '── Nur Bericht (ARTIKEL_APPLY=1 zum Schreiben) ──\n')

const medienIds: Record<string, number> = {}
for (const vorlage of MEDIEN_VORLAGEN) {
  medienIds[vorlage.schluessel] = await stelleMediumSicher(payload, vorlage)
}

console.log('')

// ── Artikel 1: Viermal Fläscher Bio-Senf mit Adanks Biofarm ──────────────
const TITEL_SENF = 'Viermal Fläscher Bio-Senf mit Adanks Biofarm'
{
  const body = toLexical([
    {
      type: 'lead',
      text: 'Auf den Feldern von Adanks Biofarm an der Neugüter 5 in Fläsch wachsen Senf, Knoblauch und Safran in biologischem Anbau. Sebastian Titz verarbeitet die Ernte direkt im Dorf zu vier eigenständigen Senfsorten im 100-Gramm-Glas.',
    },
    {
      type: 'paragraph',
      text: 'Die Zutatenliste bleibt bei allen vier Gläsern bewusst kurz: Essig, Birnell, Rapsöl, Rohrzucker und Salz — alle landwirtschaftlichen Zutaten stammen aus biologischem Anbau. Birnell gibt den Senfen eine runde, fruchtige Tiefe, ohne die natürliche Schärfe der Senfsaat zu überdecken.',
    },
    { type: 'heading', level: 2, text: 'Fläscher Gelbsenf' },
    {
      type: 'paragraph',
      text: 'Mild, ausgewogen und feinwürzig: Der gelbe Fläscher Senf trägt die Frische der Blüte in eine cremige Textur für Dressings, Käse und kalte Platten.',
    },
    { type: 'upload', mediaId: medienIds.gelbsenf, id: '671520000000000000000101' },
    { type: 'heading', level: 2, text: 'Fläscher Braunsenf' },
    {
      type: 'paragraph',
      text: 'Aus der dunklen Saat entsteht der kräftigere Gegenpol zum Gelbsenf — mit markanter Schärfe und nussigem Nachhall.',
    },
    { type: 'upload', mediaId: medienIds.braunsenf, id: '671520000000000000000102' },
    { type: 'heading', level: 2, text: 'Knoblauch-Senf' },
    {
      type: 'paragraph',
      text: 'Hier kommen zwei Kulturen vom selben Hof zusammen: eigener Fläscher Senf und eigener Bio-Knoblauch, fein abgestimmt für Grilliertes, Schmorgerichte und kräftige Vinaigrettes.',
    },
    { type: 'upload', mediaId: medienIds.knoblauchsenf, id: '671520000000000000000103' },
    { type: 'heading', level: 2, text: 'Safran-Senf' },
    {
      type: 'paragraph',
      text: 'Fläscher Safran aus eigenem Anbau verleiht dem Senf seine warme Würze und den charakteristischen Duft — gedacht zu Fisch, hellem Fleisch oder als Akzent in einer Saucenbasis.',
    },
    { type: 'upload', mediaId: medienIds.safransenf, id: '671520000000000000000104' },
  ])

  const daten = {
    title: TITEL_SENF,
    slug: slugify(TITEL_SENF),
    date: '2026-10-20T00:00:00.000Z',
    badge: 'Produkte',
    excerpt:
      'Aus dem eigenen Anbau von Adanks Biofarm in Fläsch entstehen in der Küche von Sebastian Titz vier Bio-Senfsorten im 100-Gramm-Glas: Gelbsenf, Braunsenf, Knoblauchsenf und Safransenf — mit Birnell statt raffiniertem Zucker.',
    image: medienIds.gelbsenf > 0 ? medienIds.gelbsenf : undefined,
    body: body as never,
    link: {
      label: 'Zu Adanks Biofarm',
      url: 'https://adanksbiofarm.ch',
    },
    _status: 'published' as const,
  }

  const vorhanden = await payload.find({
    collection: 'news',
    where: { title: { equals: TITEL_SENF } },
    limit: 1,
    depth: 0,
  })

  if (vorhanden.docs[0]) {
    console.log(`  ${APPLY ? 'aktualis.' : 'vorhanden'}  ${TITEL_SENF}`)
    if (APPLY) {
      await payload.update({
        collection: 'news',
        id: vorhanden.docs[0].id,
        data: daten,
      })
    }
  } else {
    console.log(`  ${APPLY ? 'anlegen  ' : 'würde    '}  ${TITEL_SENF}`)
    if (APPLY) {
      await payload.create({ collection: 'news', data: daten })
    }
  }
}

// ── Artikel 2: Kräutertour ums PINOT: Lorbeer, Rosmarin und Oregano ──────
const TITEL_KRAEUTER = 'Kräutertour ums PINOT: Lorbeer, Rosmarin und Oregano'
{
  const body = toLexical([
    {
      type: 'lead',
      text: 'Direkt vor der Küche des Restaurant PINOT in Fläsch wachsen die Kräuter im sonnigen Bündner Klima an der warmen Steinmauer. Im kurzen Rundgang zeigt Sebastian Titz drei Stauden, die täglich den Weg auf den Teller finden.',
    },
    { type: 'upload', mediaId: medienIds.kraeuterVideo, id: '671520000000000000000201' },
    { type: 'heading', level: 2, text: 'Frischer Lorbeer statt trockener Blätter' },
    {
      type: 'paragraph',
      text: 'Am mannshohen Lorbeerstrauch wird direkt vor dem Service geschnitten. Zwischen einem getrockneten Blatt aus dem Vorrat und frisch gepflücktem Lorbeer liegt in der Küche ein gewaltiger Unterschied: Das frische Blatt bringt ätherische Öle und eine helle, fast zitrische Würze mit, ohne dumpf oder bitter zu wirken.',
    },
    { type: 'heading', level: 2, text: 'Junge Rosmarinspitzen für Kräuteröl und Beurre blanc' },
    {
      type: 'paragraph',
      text: 'Am sonnigen Kiesplatz treibt der Rosmarin laufend hellgrüne, weiche Spitzen. Aus genau diesem jungen Austrieb zieht Sebastian Titz ein grünes Kräuteröl — es bleibt viel feiner als ein Auszug aus verholzten Zweigen und gibt zum Beispiel einer Beurre blanc kurz vor dem Anrichten einen klaren, duftigen Akzent.',
    },
    { type: 'heading', level: 2, text: 'Oregano für die mediterrane Seite' },
    {
      type: 'paragraph',
      text: 'Zwischen den Steinen wächst dichter, hocharomatischer Oregano. Er begleitet die mediterranen Gerichte der Karte — frisch gezupft im Ratatouille oder zu kurz sautierten Zucchetti.',
    },
  ])

  const daten = {
    title: TITEL_KRAEUTER,
    slug: slugify(TITEL_KRAEUTER),
    date: '2026-10-16T00:00:00.000Z',
    badge: 'Aus der Küche',
    excerpt:
      'Ein Rundgang durch den Kräutergarten am Restaurant PINOT in Fläsch: warum frischer Lorbeer mit getrocknetem kaum zu vergleichen ist, wie aus jungen Rosmarinspitzen Kräuteröl für die Beurre blanc entsteht und wozu der Oregano an der Steinmauer passt.',
    image: medienIds.kraeuterBild > 0 ? medienIds.kraeuterBild : undefined,
    body: body as never,
    link: {
      label: 'Zum Beitrag & Video',
      url: '/aktuelles/kraeutertour-ums-pinot-lorbeer-rosmarin-und-oregano/',
    },
    _status: 'published' as const,
  }

  const vorhanden = await payload.find({
    collection: 'news',
    where: { title: { equals: TITEL_KRAEUTER } },
    limit: 1,
    depth: 0,
  })

  if (vorhanden.docs[0]) {
    console.log(`  ${APPLY ? 'aktualis.' : 'vorhanden'}  ${TITEL_KRAEUTER}`)
    if (APPLY) {
      await payload.update({
        collection: 'news',
        id: vorhanden.docs[0].id,
        data: daten,
      })
    }
  } else {
    console.log(`  ${APPLY ? 'anlegen  ' : 'würde    '}  ${TITEL_KRAEUTER}`)
    if (APPLY) {
      await payload.create({ collection: 'news', data: daten })
    }
  }
}

// ── News-Limit auf der Startseite auf 12 anheben ─────────────────────────
{
  const seiten = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
    depth: 0,
  })
  const home = seiten.docs[0]
  if (home && Array.isArray(home.sections)) {
    let angepasst = false
    for (const block of home.sections) {
      const b = block as { blockType?: string; limit?: number | null }
      if (b.blockType === 'newsSection' && (b.limit ?? 4) < 12) {
        console.log(
          `  ${APPLY ? 'setzen   ' : 'würde    '}  Startseite newsSection.limit ${b.limit} → 12`,
        )
        b.limit = 12
        angepasst = true
      }
    }
    if (angepasst && APPLY) {
      await payload.update({
        collection: 'pages',
        id: home.id,
        data: { sections: home.sections },
      })
    }
  }
}

console.log(APPLY ? '\nGeschrieben.' : '\nNichts geschrieben.')

// Kein process.exit(): Der afterChange-Hook setzt seinen Fetch im Hintergrund ab.
