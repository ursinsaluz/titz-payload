/**
 * Befüllt Payload mit dem Content des «Verspielt»-Designs (titz.cooking - Verspielt.dc.html).
 * Legal-Seiten und SEO-Texte stammen von der Live-Site (content.json).
 * Ausführen: pnpm seed  (= payload run src/seed/index.ts)
 * Idempotent: löscht vorher alle Dokumente der geseedeten Collections.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { toLexical } from './lexical'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const inventory = JSON.parse(fs.readFileSync(path.join(dirname, 'content.json'), 'utf-8'))
const LIVE = 'https://titz.cooking'

const mediaCache = new Map<string, number>()

/** miniflare's Binding-Proxy akzeptiert keine Node-Buffer — in echte Uint8Array umwandeln. */
const toUploadData = (buffer: Buffer): Buffer =>
  new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)) as unknown as Buffer

async function uploadFromUrl(payload: Payload, src: string, alt: string): Promise<number | null> {
  const url = src.startsWith('http') ? src : `${LIVE}${src}`
  if (mediaCache.has(url)) return mediaCache.get(url)!
  const res = await fetch(url)
  if (!res.ok) {
    payload.logger.warn(`Bild nicht ladbar (${res.status}): ${url}`)
    return null
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  const name = path.basename(new URL(url).pathname)
  const mimetype = res.headers.get('content-type') ?? 'image/webp'
  const doc = await payload.create({
    collection: 'media',
    data: { alt },
    file: { data: toUploadData(buffer), name, mimetype, size: buffer.length },
  })
  mediaCache.set(url, doc.id as number)
  return doc.id as number
}

async function wipe(payload: Payload, collection: string) {
  await payload.delete({ collection: collection as never, where: { id: { exists: true } } })
}

/** Toast-Sprüche pro Gemüse-Icon (aus dem Verspielt-Design). */
const vegToasts: Record<string, string[]> = {
  zwiebel: ['Die Zwiebel — das einzige Mise en Place, das zurückweint.', 'Die Roter-Nebel-Zwiebel weint übrigens zurück. In Farben. ✦'],
  knoblauch: ['Knoblauch: das Fundament jeder guten Küche. Und jedes freien Abends.', 'Anzati-Rotzknoblauch hat der Guide Michelin nie berücksichtigt. Zu Recht. ✦'],
  tomate: ['Wissen: Die Tomate ist eine Frucht. Weisheit: Sie kommt trotzdem nicht ins Dessert.', 'In einer weit entfernten Galaxie heisst sie Topato. Ja, wirklich. ✦'],
  kuerbis: ['Der Kürbis bleibt bis Mitternacht — danach fährt er als Kutsche heim.', 'Nicht zu verwechseln mit dem Blähkürbis. Der bläht. ✦'],
  karotte: ['Karotten sind gut für die Augen. Oder hast du je ein Kaninchen mit Brille gesehen?', 'Die Raum-Karotte schmeckt exakt gleich. Nur weiter weg. ✦'],
  radieschen: ['Das Radieschen: klein, scharf, ehrlich.'],
  lauch: ['Der Lauch steht immer gerade. Haltung ist alles.'],
  beeren: ['Beeren — der Grund, warum der Sommer kurz sein darf.'],
  kraeuter: ['Kräuter über Fläsch: gepflückt, nicht bestellt.'],
  spargel: ['Weisser Spargel: schläft unter der Erde und ist trotzdem der Star.'],
  pilz: ['Pilze — der Wald schickt Vorräte.', 'Schwammgemüse ist KEIN Ersatz. Egal, was die Cantina sagt. ✦'],
  quitte: ['Die Quitte: zu hart zum Reinbeissen, zu gut zum Weglassen.'],
  randen: ['Randen färben alles. Vor allem die Meinung.'],
  kohl: ['Kohl braucht Frost und Geduld. Wie gute Gäste.', 'See-Kohl gibt es nur auf Mon Cala. Wir bleiben beim Bündner. ✦'],
  baumnuss: ['Baumnüsse: das Dessert wächst am Baum.'],
  apfel: ['Lageräpfel — Geduld, die man schmeckt.'],
  birne: ['Die Birne wartet, bis du wegschaust. Dann ist sie reif.'],
  ananas: ['Die Ananas trägt als Einzige eine Krone. Exzellenz eben. (Ja — botanisch eine Frucht. Kronen kennen keine Schubladen.)'],
}

async function run() {
  const payload = await getPayload({ config })

  // Wipe-Reihenfolge wegen FK-Referenzen: erst referenzierende Inhalte und
  // Global-Referenzen, dann Icons/Media.
  for (const collection of ['pages', 'news', 'angebote', 'signature-dishes', 'stationen']) {
    await wipe(payload, collection)
  }
  // Auf frischer DB existieren die Globals noch nicht / scheitern an Pflichtfeldern — dann gibt es auch nichts abzuräumen.
  const clearGlobal = async (slug: string, data: Record<string, unknown>) => {
    try {
      await payload.updateGlobal({ slug: slug as never, data })
    } catch {
      /* Global noch leer */
    }
  }
  await clearGlobal('footer', { socials: [] })
  await clearGlobal('site-settings', { defaultSeo: { image: null } })
  await clearGlobal('header', { logo: { image: null }, stage: { image: null } })

  // --- Icons (Assets aus assets/icons — UI + 18 Gemüse mit Toast-Sprüchen) ---
  await wipe(payload, 'icons')
  const iconsDir = path.join(dirname, 'assets/icons')
  const iconIds = new Map<string, number>()
  for (const file of fs.readdirSync(iconsDir).filter((f) => f.endsWith('.svg'))) {
    const name = file.replace(/\.svg$/, '')
    const svg = fs.readFileSync(path.join(iconsDir, file), 'utf-8').trim()
    const buffer = Buffer.from(svg, 'utf-8')
    const doc = await payload.create({
      collection: 'icons',
      data: {
        name,
        svg,
        toasts: (vegToasts[name] ?? []).map((text) => ({ text })),
      },
      file: { data: toUploadData(buffer), name: file, mimetype: 'image/svg+xml', size: buffer.length },
    })
    iconIds.set(name, doc.id as number)
  }
  payload.logger.info(`${iconIds.size} Icons angelegt (${Object.keys(vegToasts).length} mit Toasts)`)
  const icon = (name: string) => iconIds.get(name) ?? null

  // --- Media (Bilder von der Live-Site + lokale Assets wie das Instagram-Icon) ---
  await wipe(payload, 'media')
  const mediaDir = path.join(dirname, 'assets/media')
  const mediaAssets = new Map<string, number>()
  for (const file of fs.readdirSync(mediaDir)) {
    const buffer = fs.readFileSync(path.join(mediaDir, file))
    const name = file.replace(/\.\w+$/, '')
    const doc = await payload.create({
      collection: 'media',
      data: { alt: name.charAt(0).toUpperCase() + name.slice(1) },
      file: {
        data: toUploadData(buffer),
        name: file,
        mimetype: file.endsWith('.svg') ? 'image/svg+xml' : 'image/webp',
        size: buffer.length,
      },
    })
    mediaAssets.set(name, doc.id as number)
  }
  const ogId = await uploadFromUrl(payload, inventory.seo.home.ogImage, 'Sebastian Titz')
  const newsImage = async (href: string, alt: string) => {
    const card = inventory.aktuelles.cards.find((c: { link?: { href?: string } }) => c.link?.href === href)
    return card?.image ? uploadFromUrl(payload, card.image.src, alt) : null
  }

  // --- News (4 kuratierte Einträge aus dem Verspielt-Design) ---
  const news = [
    {
      title: 'Falstaff — Restaurants & Beizen Guide 2026',
      date: '2026-01-02',
      excerpt: 'Anerkennung für regionale Küche, hochwertige Zutaten und die kreative Handschrift.',
      url: 'https://www.falstaff.com/ch/restaurants/pinot-flaesch',
    },
    {
      title: 'Was kochst du?! — Gespräch unter Chefs',
      date: '2025-10-21',
      excerpt: 'Mit Andy Piesche, Felix Jarzina und Sebastian Titz.',
      url: 'https://www.youtube.com/watch?v=8Kh9AnolQBA',
    },
    {
      title: 'Mit Leidenschaft kochen — Porträt',
      date: '2025-08-20',
      excerpt: '20 Jahre Gourmetgastronomie und die Liebe zum Handwerk (Salz & Pfeffer).',
      url: 'https://www.salz-pfeffer.ch/artikel/mit-leidenschaft-kochen/',
    },
    {
      title: 'Bib Gourmand für das Restaurant Pinot',
      date: '2024-10-15',
      excerpt: 'Der Guide Michelin würdigt das Preis-Leistungs-Verhältnis: «Simply brilliant».',
      url: 'https://guide.michelin.com/de/de/graubunden/flsch/restaurant/pinot',
    },
  ]
  for (const item of news) {
    await payload.create({
      collection: 'news',
      data: {
        title: item.title,
        date: new Date(item.date).toISOString(),
        excerpt: item.excerpt,
        image: await newsImage(item.url, item.title),
        link: { label: 'Mehr lesen', url: item.url },
        _status: 'published',
      },
    })
  }
  payload.logger.info(`${news.length} News angelegt`)

  // --- Angebote (Beratung & Catering) ---
  const angebote = [
    {
      title: 'Beratung',
      icon: icon('randen'),
      paragraphs: [
        'Kulinarische Konzepte für Health- & Lifestyle-Resorts: Küchenplanung und Workflow-Optimierung, Menükonzeption und Rezepturentwicklung, Mitarbeiter-Coaching — Leadership statt klassischer Hierarchien.',
        'Ein Blick von aussen hilft, Prozesse zu erkennen und das volle Potenzial des Teams zu entfalten — bis es selbstständig auf Sterneniveau umsetzt.',
      ],
      cta: { label: 'Beratung anfragen', url: 'mailto:info@titz.cooking?subject=Beratung' },
    },
    {
      title: 'Catering',
      icon: icon('baumnuss'),
      paragraphs: [
        'Nachhaltige Sternenküche für Ihren Event, 10 bis 100 Personen — vom Soil-to-Soul-Menü über Classic Fine Dining bis Flying Dinner & Tavolata.',
        'Graubünden & Bündner Herrschaft, St. Galler Rheintal, ganze Ostschweiz — auf Anfrage schweizweit. Pflanzenbasierte Gerichte haben einen extrem hohen Stellenwert.',
      ],
      cta: { label: 'Catering anfragen', url: 'mailto:info@titz.cooking?subject=Catering' },
    },
  ]
  let order = 0
  for (const item of angebote) {
    await payload.create({
      collection: 'angebote',
      data: {
        title: item.title,
        icon: item.icon,
        description: toLexical(item.paragraphs.map((text) => ({ type: 'paragraph', text }))) as never,
        cta: item.cta,
        order: order++,
      },
    })
  }
  payload.logger.info(`${angebote.length} Angebote angelegt`)

  // --- Signature Dishes ---
  const dishes = [
    {
      name: 'Milcheis mit Spekulatius',
      tag: 'Signature',
      icon: icon('apfel'),
      description: 'Winterliche Aromen, technische Finesse: geflämmte Meringue, Apfel und Spekulatius.',
      videoUrl: 'https://www.youtube.com/watch?v=6t92tOv0Hvk',
    },
    {
      name: 'Heusuppe',
      tag: 'Signature',
      icon: icon('kraeuter'),
      description: 'Hommage an Stefan Wiesner: der Geschmack von getrocknetem Heu, samtig eingefangen. Natur pur.',
    },
    {
      name: 'Angus Beef Tartare',
      tag: 'Starter',
      icon: icon('randen'),
      description: 'Eine Hommage an die Erde: das Rohe des Rindes trifft auf die Textur des Selleries.',
    },
    {
      name: 'Kalb mit Schwarzem Trüffel',
      tag: 'Signature',
      icon: icon('pilz'),
      description: 'Heimat trifft Luxus: zartes Kalb, die Tiefe des Trüffels, Serviettenknödel.',
    },
  ]
  order = 0
  for (const dish of dishes) {
    await payload.create({
      collection: 'signature-dishes',
      data: { ...dish, order: order++ },
    })
  }
  payload.logger.info(`${dishes.length} Signature Dishes angelegt`)

  // --- Stationen (kompakter Lebenslauf aus dem Design) ---
  const stationen: { group: string; period?: string; title: string; place?: string; description?: string }[] = [
    { group: 'stationen', period: 'Seit 2025', title: 'Restaurant Pinot', place: 'Fläsch', description: 'Küchenchef & Gastgeber, Klinik Gut — Bib Gourmand, Falstaff Guide 2026' },
    { group: 'stationen', period: '2019 – 2024', title: 'Restaurant Verve by Sven', place: 'Grand Resort Bad Ragaz', description: 'Küchenchef — 15 GaultMillau-Punkte, 1 Michelin-Stern; Manager of the Quarter 2022' },
    { group: 'stationen', period: '2015 – 2018', title: 'Hotel Villa Honegg', place: 'Ennetbürgen', description: 'Küchenchef, 12-köpfige Brigade — 14 GaultMillau-Punkte' },
    { group: 'stationen', period: '2008 – 2015', title: 'Gasthof Rössli', place: 'Escholzmatt', description: 'Mit Natur-Alchemist Stefan Wiesner; Co-Autor «Avantgardistische Naturküche» (2011) — 17 GaultMillau-Punkte, 1 Michelin-Stern' },
    { group: 'stationen', period: 'Fundament', title: 'Frühe Stationen', description: 'Chef de Partie u.a. bei Jörg Müller (Sylt) und in Schweizer 5-Sterne-Häusern' },
    { group: 'qualifikationen', title: 'Küchenplanung & Workflow' },
    { group: 'qualifikationen', title: 'Menükonzeption Health & Lifestyle' },
    { group: 'qualifikationen', title: 'Avantgardistische Naturküche' },
    { group: 'qualifikationen', title: 'Leadership & Coaching' },
    { group: 'qualifikationen', title: 'Kalkulation & Dienstplanung' },
    { group: 'qualifikationen', title: 'Event-Gastronomie' },
    { group: 'ausbildung', title: 'Kochlehre', place: 'Restaurant Schneggen', description: 'Klassische französische Basisküche, verfeinert über Stationen in den besten Küchen Europas' },
    { group: 'hobbies', title: 'Familie & Freunde' },
    { group: 'hobbies', title: 'Trailrunning — am liebsten über Fläsch' },
    { group: 'hobbies', title: '…und manchmal eine Galaxie weit, weit entfernt' },
  ]
  order = 0
  for (const station of stationen) {
    await payload.create({ collection: 'stationen', data: { ...station, order: order++ } })
  }
  payload.logger.info(`${stationen.length} Stationen angelegt`)

  // --- Seiten ---
  const homeSections = [
    {
      blockType: 'philosophie',
      anchor: 'philosophie',
      eyebrow: 'Philosophie',
      heading: 'So koche ich, wie ich bin.',
      values: [
        {
          icon: icon('zwiebel'),
          title: 'Authentisch',
          text: 'Ehrlich und ohne Schnickschnack: bodenständig, direkt, ohne viel Chichi — aber mit tiefem Respekt vor dem Ursprung unserer Nahrung.',
        },
        {
          icon: icon('kohl'),
          title: 'Regional',
          text: 'Aus der Heimat auf den Teller: Gemüse frisch vom Feld aus dem Bündner Rheintal, Fleisch von Höfen, bei denen Tierwohl an erster Stelle steht — im Rhythmus der vier Jahreszeiten.',
        },
        {
          icon: icon('ananas'),
          title: 'Exzellent',
          text: 'Die Natur als Massstab: Goldener Schnitt und Fibonacci-Reihe zeigen, wie Harmonie aussieht — diese Ordnung inspiriert jedes Anrichten.',
        },
      ],
    },
    {
      blockType: 'signatureDishesSection',
      anchor: 'dishes',
      eyebrow: 'Signature Dishes',
      heading: 'Vier Teller, eine Handschrift.',
    },
    {
      blockType: 'visitSection',
      anchor: 'pinot',
      eyebrow: 'Restaurant Pinot · seit 2025',
      heading: 'Rückkehr zur Intimität.',
      body: toLexical([
        {
          type: 'paragraph',
          text: 'In der Klinik Gut im wunderschönen Fläsch leite ich das Restaurant Pinot. Hier konzentrieren wir uns auf das Wesentliche: herausragende Produkte, handwerkliche Perfektion und eine tiefe Verbundenheit mit der Region.',
        },
        { type: 'paragraph', text: 'Kommen Sie vorbei und erleben Sie ehrliche Küche ohne Kompromisse.' },
      ]) as never,
      infos: [
        { label: 'Adresse', value: 'Restaurant PINOT\nSteigstrasse 14, 7306 Fläsch' },
        { label: 'Öffnungszeiten', value: 'Täglich 09:00 – 18:00\nDonnerstags Abendessen ab 18:00' },
        { label: 'Ausgezeichnet', value: 'Bib Gourmand — «Simply brilliant»\nFalstaff Guide 2026' },
      ],
      cta: { label: 'Tisch reservieren', url: 'https://www.restaurant-pinot.ch/' },
      secondaryCta: { label: 'E-Mail schreiben', url: 'mailto:info@titz.cooking' },
    },
    {
      blockType: 'stationenSection',
      anchor: 'lebenslauf',
      eyebrow: 'Lebenslauf',
      heading: '20 Jahre am Herd.',
    },
    {
      blockType: 'angeboteSection',
      anchor: 'angebote',
      eyebrow: 'Angebote',
      heading: 'Beratung & Catering',
    },
    {
      blockType: 'newsSection',
      anchor: 'aktuelles',
      eyebrow: 'Aktuelles',
      heading: 'Aktuelles',
      limit: 4,
    },
  ]

  const homePage = await payload.create({
    collection: 'pages',
    data: {
      title: 'Home',
      slug: 'home',
      sections: homeSections as never,
      seo: { title: inventory.seo.home.title, description: inventory.seo.home.description, image: ogId },
      _status: 'published',
    },
  })

  const impressumPage = await payload.create({
    collection: 'pages',
    data: {
      title: 'Impressum',
      slug: 'impressum',
      sections: [
        {
          blockType: 'richTextSection',
          heading: inventory.impressum.heading,
          body: toLexical(inventory.impressum.content) as never,
        },
      ] as never,
      seo: {
        title: 'Impressum - Sebastian Titz',
        description: inventory.seo.impressum.description,
        noIndex: true,
      },
      _status: 'published',
    },
  })

  const datenschutzPage = await payload.create({
    collection: 'pages',
    data: {
      title: 'Datenschutz',
      slug: 'datenschutz',
      sections: [
        {
          blockType: 'richTextSection',
          heading: inventory.datenschutz.heading,
          body: toLexical(inventory.datenschutz.content) as never,
        },
      ] as never,
      seo: {
        title: 'Datenschutz - Sebastian Titz',
        description: inventory.seo.datenschutz.description,
        noIndex: true,
      },
      _status: 'published',
    },
  })
  payload.logger.info('3 Seiten angelegt')

  // --- Globals ---
  await payload.updateGlobal({
    slug: 'header',
    data: {
      logo: { text: 'Titz' },
      nav: [
        { label: 'Philosophie', linkType: 'anchor', anchor: 'philosophie' },
        { label: 'Dishes', linkType: 'anchor', anchor: 'dishes' },
        { label: 'Pinot', linkType: 'anchor', anchor: 'pinot' },
        { label: 'Lebenslauf', linkType: 'anchor', anchor: 'lebenslauf' },
        { label: 'Angebote', linkType: 'anchor', anchor: 'angebote' },
        { label: 'Aktuelles', linkType: 'anchor', anchor: 'aktuelles' },
      ],
      cta: { label: 'Reservieren', url: 'https://www.restaurant-pinot.ch/' },
      stage: {
        eyebrow: 'Sebastian Titz · Chefkoch · Fläsch',
        headline: 'Authentisch. Regional. Exzellent.',
        subline:
          'Kulinarik zwischen Michelin-Stern und Bündner Bodenständigkeit — schnörkellose Gerichte mit einem echten Wow-Effekt im Mund.',
        badges: [
          { label: '16 GaultMillau' },
          { label: 'Bib Gourmand · Michelin' },
          { label: '1 Stern · Stationen' },
        ],
        scrollHint: 'klick dich durchs Gemüse.',
      },
    },
  })

  await payload.updateGlobal({
    slug: 'footer',
    data: {
      contact: {
        address: 'Restaurant PINOT\nSteigstrasse 14, 7306 Fläsch\nFläsch GR, Schweiz',
        email: 'info@titz.cooking',
      },
      socials: [
        { icon: mediaAssets.get('instagram') ?? null, label: '@titzsebastian', url: 'https://www.instagram.com/titzsebastian/' },
      ],
      legalLinks: [
        { label: 'Impressum', linkType: 'page', page: impressumPage.id },
        { label: 'Datenschutz', linkType: 'page', page: datenschutzPage.id },
      ],
      copyright: '© 2026 Sebastian Titz',
    },
  })

  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      siteName: 'Sebastian Titz',
      domain: inventory.site.domain,
      defaultSeo: {
        title: inventory.seo.home.title,
        titleTemplate: '%s | Sebastian Titz',
        description: inventory.seo.home.description,
        image: ogId,
      },
      easterEggs: {
        completionToast: 'Alle 18 Zutaten entdeckt — das Menü ist komplett. Merci vielmal! ✦',
        starToast: '„Vor langer Zeit, in einer Küche weit, weit entfernt…" ✦',
      },
    },
  })
  payload.logger.info('Globals (Header/Stage, Footer, Site & SEO) gesetzt')

  payload.logger.info(`Seed fertig — Home-Page id=${homePage.id}`)
  process.exit(0)
}

try {
  await run()
} catch (error) {
  console.error(error)
  process.exit(1)
}
