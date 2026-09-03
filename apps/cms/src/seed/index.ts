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
import { MEDIEN, VEG_TOASTS, type MedienSchluessel } from './inhalte'
import { slugify } from '../fields/slugFeld'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const inventory = JSON.parse(fs.readFileSync(path.join(dirname, 'content.json'), 'utf-8'))

// Der Seed schreibt dutzende Datensätze, und an jedem hängt der Rebuild-Hook.
// Ohne diese Zeile stiesse ein Seed eine Serie von Frontend-Builds an. Der
// Rebuild nach dem Seed passiert bewusst von Hand.
process.env.WEB_DEPLOY_HOOK_URL = ''

/** miniflare's Binding-Proxy akzeptiert keine Node-Buffer — in echte Uint8Array umwandeln. */
const toUploadData = (buffer: Buffer): Buffer =>
  new Uint8Array(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  ) as unknown as Buffer

async function wipe(payload: Payload, collection: string) {
  await payload.delete({ collection: collection as never, where: { id: { exists: true } } })
}

async function run() {
  const payload = await getPayload({ config })

  // Wipe-Reihenfolge wegen FK-Referenzen: erst referenzierende Inhalte und
  // Global-Referenzen, dann Icons/Media.
  for (const collection of ['pages', 'news', 'angebote', 'signature-dishes', 'stationen']) {
    await wipe(payload, collection)
  }
  // Auf frischer DB existieren die Globals noch nicht / scheitern an Pflichtfeldern — dann gibt es auch nichts abzuräumen.
  const clearGlobal = async (slug: string, data: any) => {
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
        toasts: (VEG_TOASTS[name] ?? []).map((text) => ({ text })),
      },
      file: {
        data: toUploadData(buffer),
        name: file,
        mimetype: 'image/svg+xml',
        size: buffer.length,
      },
    })
    iconIds.set(name, doc.id as number)
  }
  payload.logger.info(
    `${iconIds.size} Icons angelegt (${Object.keys(VEG_TOASTS).length} mit Toasts)`,
  )
  const icon = (name: string) => iconIds.get(name) ?? null

  // --- Media (Bilder von der Live-Site + lokale Assets wie das Instagram-Icon) ---
  await wipe(payload, 'media')
  const mediaDir = path.join(dirname, 'assets/media')
  const medien = new Map<MedienSchluessel, number>()
  for (const [schluessel, { datei, alt }] of Object.entries(MEDIEN)) {
    const buffer = fs.readFileSync(path.join(mediaDir, datei))
    const doc = await payload.create({
      collection: 'media',
      data: { alt },
      file: {
        data: toUploadData(buffer),
        name: datei,
        mimetype: datei.endsWith('.svg') ? 'image/svg+xml' : 'image/webp',
        size: buffer.length,
      },
    })
    medien.set(schluessel as MedienSchluessel, doc.id as number)
  }
  payload.logger.info(`${medien.size} Bilder hochgeladen`)
  const bild = (schluessel: MedienSchluessel) => medien.get(schluessel) ?? null
  const ogId = bild('portrait')

  /** Welches Bild zu welcher Meldung. Die Presselogos der Originalseite liegen
      nicht im Repo; das sind eigene Aufnahmen, die redaktionell im Admin
      ausgetauscht werden können. */
  const newsBilder: Record<string, MedienSchluessel> = {
    'https://www.falstaff.com/ch/restaurants/pinot-flaesch': 'pinotTisch',
    'https://www.youtube.com/watch?v=8Kh9AnolQBA': 'kuecheFinish',
    'https://www.salz-pfeffer.ch/artikel/mit-leidenschaft-kochen/': 'anrichten',
    'https://guide.michelin.com/de/de/graubunden/flsch/restaurant/pinot': 'pinotTeller',
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
        image: newsBilder[item.url] ? bild(newsBilder[item.url]) : null,
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
        // Der `beforeValidate`-Hook am Feld würde den Slug selbst bilden, das
        // generierte Modell verlangt ihn aber trotzdem — Payloads Typen kennen
        // die Hooks nicht. Explizit ist hier ohnehin besser: Der Seed schreibt
        // damit denselben Slug, den ein Anlegen im Admin ergäbe.
        slug: slugify(item.title),
        icon: item.icon,
        description: toLexical(
          item.paragraphs.map((text) => ({ type: 'paragraph', text })),
        ) as never,
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
      description:
        'Winterliche Aromen, technische Finesse: geflämmte Meringue, Apfel und Spekulatius.',
      videoUrl: 'https://www.youtube.com/watch?v=6t92tOv0Hvk',
    },
    {
      name: 'Heusuppe',
      tag: 'Signature',
      icon: icon('kraeuter'),
      description:
        'Hommage an Stefan Wiesner: der Geschmack von getrocknetem Heu, samtig eingefangen. Natur pur.',
    },
    {
      name: 'Angus Beef Tartare',
      tag: 'Starter',
      icon: icon('randen'),
      description:
        'Eine Hommage an die Erde: das Rohe des Rindes trifft auf die Textur des Selleries.',
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
  const stationen: {
    group: string
    period?: string
    title: string
    place?: string
    description?: string
  }[] = [
    {
      group: 'stationen',
      period: 'Seit 2025',
      title: 'Restaurant Pinot',
      place: 'Fläsch',
      description: 'Küchenchef & Gastgeber, Klinik Gut — Bib Gourmand, Falstaff Guide 2026',
    },
    {
      group: 'stationen',
      period: '2019 – 2024',
      title: 'Restaurant Verve by Sven',
      place: 'Grand Resort Bad Ragaz',
      description:
        'Küchenchef — 15 GaultMillau-Punkte, 1 Michelin-Stern; Manager of the Quarter 2022',
    },
    {
      group: 'stationen',
      period: '2015 – 2018',
      title: 'Hotel Villa Honegg',
      place: 'Ennetbürgen',
      description: 'Küchenchef, 12-köpfige Brigade — 14 GaultMillau-Punkte',
    },
    {
      group: 'stationen',
      period: '2008 – 2015',
      title: 'Gasthof Rössli',
      place: 'Escholzmatt',
      description:
        'Mit Natur-Alchemist Stefan Wiesner; Co-Autor «Avantgardistische Naturküche» (2011) — 17 GaultMillau-Punkte, 1 Michelin-Stern',
    },
    {
      group: 'stationen',
      period: 'Fundament',
      title: 'Frühe Stationen',
      description: 'Chef de Partie u.a. bei Jörg Müller (Sylt) und in Schweizer 5-Sterne-Häusern',
    },
    { group: 'qualifikationen', title: 'Küchenplanung & Workflow' },
    { group: 'qualifikationen', title: 'Menükonzeption Health & Lifestyle' },
    { group: 'qualifikationen', title: 'Avantgardistische Naturküche' },
    { group: 'qualifikationen', title: 'Leadership & Coaching' },
    { group: 'qualifikationen', title: 'Kalkulation & Dienstplanung' },
    { group: 'qualifikationen', title: 'Event-Gastronomie' },
    {
      group: 'ausbildung',
      title: 'Kochlehre',
      place: 'Restaurant Schneggen',
      description:
        'Klassische französische Basisküche, verfeinert über Stationen in den besten Küchen Europas',
    },
    { group: 'hobbies', title: 'Familie & Freunde' },
    { group: 'hobbies', title: 'Trailrunning — am liebsten über Fläsch' },
    { group: 'hobbies', title: '…und manchmal eine Galaxie weit, weit entfernt' },
  ]
  order = 0
  for (const station of stationen) {
    await payload.create({ collection: 'stationen', data: { ...station, order: order++ } as any })
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
        {
          type: 'paragraph',
          text: 'Kommen Sie vorbei und erleben Sie ehrliche Küche ohne Kompromisse.',
        },
      ]) as never,
      infos: [
        { label: 'Adresse', value: 'Restaurant PINOT\nSteigstrasse 14, 7306 Fläsch' },
        {
          label: 'Öffnungszeiten',
          value: 'Täglich 09:00 – 18:00\nDonnerstags Abendessen ab 18:00',
        },
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
      seo: {
        title: inventory.seo.home.title,
        description: inventory.seo.home.description,
        image: ogId,
      },
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
        {
          icon: bild('instagram'),
          label: '@titzsebastian',
          url: 'https://www.instagram.com/titzsebastian/',
        },
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
