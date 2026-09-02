import type { Config, Event } from '@titz/types'

/**
 * Strukturierte Daten (JSON-LD) für die Startseite.
 *
 * Ohne diese Auszeichnung weiss Google nicht, dass hier eine Person mit Beruf,
 * Auszeichnungen und Einsatzgebiet steht — es liest nur Text. Genau daraus baut
 * Google die Wissenspanels und Auszeichnungs-Snippets, die bei Köchen einen
 * grossen Teil der Ergebnisfläche einnehmen.
 *
 * Alles hier wird aus dem CMS gebaut und nicht von Hand gepflegt. Eine neue
 * Auszeichnung im Admin erscheint damit ohne Zutun auch im Schema; eine
 * handgeschriebene Fassung wäre nach der ersten Änderung falsch.
 *
 * **Was hier bewusst nicht steht.**
 *
 * `NewsArticle` oder `Article` für die Aktuelles-Einträge. Die verlinken auf
 * Beiträge von GaultMillau, Falstaff und Salz & Pfeffer — fremde Texte über
 * Sebastian, nicht seine eigenen. Sie als seine `Article` auszuzeichnen würde
 * eine Urheberschaft behaupten, die es nicht gibt. Richtig ist der umgekehrte
 * Bezug: `subjectOf` sagt «diese Person ist Gegenstand dieser Beiträge», und
 * das ist wahr und für Google genauso verwertbar.
 *
 * `Restaurant`. Das Pinot ist ein Restaurant und hat mit restaurant-pinot.ch
 * eine eigene Seite, die für Restaurantsuchen ranken soll. Würde titz.cooking
 * sich ebenfalls als Restaurant ausweisen, konkurrierten zwei Domains um
 * dieselben Suchen und teilten die Signale. Hier steht darum `worksFor` —
 * die Beziehung, nicht der Betrieb.
 */

const AUTOR = 'https://titz.cooking/#person'

/**
 * Das Einsatzgebiet. Diese Namen sind der Grund, warum es das Feld gibt: Google
 * verknüpft `areaServed` mit seinen eigenen Ortsdaten, und Herrschaft,
 * Sarganserland und Werdenberg sind die drei Regionen, um die es geht.
 */
const GEBIETE = [
  'Bündner Herrschaft',
  'Sarganserland',
  'Werdenberg',
  'Graubünden',
  'St. Galler Rheintal',
  'Liechtenstein',
  'Ostschweiz',
]

type Station = Config['collections']['stationen']
type News = Config['collections']['news']
type Angebot = Config['collections']['angebote']
type Header = Config['globals']['header']
type Footer = Config['globals']['footer']
type Settings = Config['globals']['site-settings']

/** Ein Wert, der leer ist, gehört nicht ins Schema — Google liest ihn als Angabe. */
const ohneLeere = <T extends Record<string, unknown>>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => {
      if (v === null || v === undefined || v === '') return false
      if (Array.isArray(v)) return v.length > 0
      return true
    }),
  ) as T

/**
 * Die Auszeichnungen. Sie stehen im CMS an zwei Stellen: als Badges in der
 * Stage und als Highlights an den Stationen. Beide werden hier eingesammelt,
 * damit keine fehlt, wenn Sebastian sie nur an einer Stelle nachträgt.
 */
function auszeichnungen(header: Header, stationen: Station[]): string[] {
  const aus = new Set<string>()

  for (const badge of header.stage?.badges ?? []) {
    if (badge.label) aus.add(badge.label)
  }

  for (const station of stationen) {
    for (const h of station.highlights ?? []) {
      if (h.text) aus.add(h.text)
    }
  }

  return [...aus]
}

/** Die Laufbahn als `OrganizationRole` — Betrieb, Position und Zeitraum. */
function laufbahn(stationen: Station[]) {
  return stationen
    .filter((s) => s.group === 'stationen' && s.title)
    .map((s) =>
      ohneLeere({
        '@type': 'OrganizationRole',
        roleName: s.description ?? undefined,
        startDate: undefined,
        namedPosition: s.period ?? undefined,
        worksFor: ohneLeere({
          '@type': 'Organization',
          name: s.title,
          address: s.place ?? undefined,
        }),
      }),
    )
}

/**
 * Die Anlässe als `Event`.
 *
 * Aus dieser Auszeichnung baut Google eigene Termin-Ergebnisse — mit Datum,
 * Uhrzeit und Ort direkt in der Suche. Für einen wiederkehrenden Anlass ist
 * `eventSchedule` der richtige Weg und nicht ein erfundenes Einzeldatum: Es
 * beschreibt die Regel («jeden Donnerstag ab 18:00») statt einen Termin, der
 * nächste Woche falsch wäre.
 *
 * `eventAttendanceMode` und `eventStatus` sind Pflichtangaben, seit Google die
 * Termin-Ergebnisse um Online-Anlässe erweitert hat. Ohne sie wird der Eintrag
 * stillschweigend verworfen.
 */
function anlaesse(events: Event[], domain: string) {
  return events
    .filter((e) => e.title && e._status !== 'draft')
    .map((e) => {
      const wiederkehrend = e.rhythmus === 'woechentlich'

      return ohneLeere({
        '@type': 'Event',
        name: e.title,
        description: e.excerpt ?? undefined,
        url: `${domain}/#anlaesse`,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        inLanguage: 'de-CH',
        location: e.ort
          ? {
              '@type': 'Place',
              name: e.ort.split(',')[0]?.trim(),
              address: e.ort,
            }
          : undefined,
        performer: { '@id': AUTOR },
        organizer: { '@id': AUTOR },
        // Ein einzelner Termin trägt `startDate`, eine Reihe `eventSchedule`.
        // Beides zugleich wäre widersprüchlich.
        startDate: !wiederkehrend && e.datum ? datumZeit(e.datum, e.zeit) : undefined,
        eventSchedule: wiederkehrend
          ? ohneLeere({
              '@type': 'Schedule',
              repeatFrequency: 'P1W',
              byDay: e.wochentag ? `https://schema.org/${e.wochentag}` : undefined,
              startTime: e.zeit ? `${e.zeit}:00` : undefined,
              startDate: e.datum ? String(e.datum).slice(0, 10) : undefined,
              scheduleTimezone: 'Europe/Zurich',
            })
          : undefined,
        offers: e.preis
          ? ohneLeere({
              '@type': 'Offer',
              price: e.preis.replace(/[^\d.]/g, '') || undefined,
              priceCurrency: /chf/i.test(e.preis) ? 'CHF' : undefined,
              description: e.preis,
              url: e.cta?.url ?? undefined,
              availability: 'https://schema.org/InStock',
            })
          : undefined,
      })
    })
}

/** «2026-09-10» und «18:00» zu einem ISO-Zeitpunkt mit Schweizer Zone. */
function datumZeit(datum: string, zeit?: string | null): string {
  const tag = String(datum).slice(0, 10)
  if (!zeit) return tag
  return `${tag}T${zeit.length === 5 ? zeit : zeit.padStart(5, '0')}:00+02:00`
}

export function startseitenSchema(args: {
  header: Header
  footer: Footer
  settings: Settings
  stationen: Station[]
  news: News[]
  angebote: Angebot[]
  events: Event[]
  portrait?: string
}) {
  const { header, footer, settings, stationen, news, angebote, events, portrait } = args
  const domain = settings.domain ?? 'https://titz.cooking'
  const name = settings.siteName ?? 'Sebastian Titz'

  const aktuell = stationen.find((s) => s.group === 'stationen' && s.period?.match(/seit/i))

  const person = ohneLeere({
    '@type': 'Person',
    '@id': AUTOR,
    name,
    jobTitle: 'Küchenchef',
    description: settings.defaultSeo?.description ?? undefined,
    url: `${domain}/`,
    image: portrait,
    email: footer.contact?.email ? `mailto:${footer.contact.email}` : undefined,
    // Instagram und Ähnliches: `sameAs` sagt Google, dass die Profile dieselbe
    // Person sind. Ohne das bleiben es unverbundene Treffer.
    sameAs: (footer.socials ?? []).map((s) => s.url).filter(Boolean),
    knowsAbout: [
      'Avantgardistische Naturküche',
      'Health- und Lifestyle-Küche',
      'Pflanzenbasierte Küche',
      'Regionale Wertschöpfungsketten',
      'Küchenplanung',
      'Menükonzeption',
      'Fine Dining',
    ],
    award: auszeichnungen(header, stationen),
    hasOccupation: {
      '@type': 'Occupation',
      name: 'Küchenchef',
      occupationLocation: GEBIETE.map((g) => ({ '@type': 'Place', name: g })),
    },
    worksFor: aktuell
      ? ohneLeere({
          '@type': 'Organization',
          name: aktuell.title,
          address: aktuell.place ?? undefined,
        })
      : undefined,
    hasOccupationalCredential: laufbahn(stationen),
    // Fremde Beiträge über ihn. Siehe die Begründung im Dateikopf.
    subjectOf: news
      .filter((n) => n.link?.url)
      .map((n) =>
        ohneLeere({
          '@type': 'CreativeWork',
          name: n.title,
          url: n.link?.url ?? undefined,
          datePublished: n.date ? String(n.date).slice(0, 10) : undefined,
          abstract: n.excerpt ?? undefined,
        }),
      ),
  })

  const dienste = angebote
    .filter((a) => a.title)
    .map((a) =>
      ohneLeere({
        '@type': 'Service',
        name: a.title,
        serviceType: a.eyebrow ?? undefined,
        provider: { '@id': AUTOR },
        areaServed: GEBIETE.map((g) => ({ '@type': 'AdministrativeArea', name: g })),
        url: `${domain}/#angebote`,
      }),
    )

  const website = ohneLeere({
    '@type': 'WebSite',
    '@id': `${domain}/#website`,
    url: `${domain}/`,
    name,
    inLanguage: 'de-CH',
    publisher: { '@id': AUTOR },
  })

  return {
    '@context': 'https://schema.org',
    '@graph': [person, website, ...dienste, ...anlaesse(events, domain)],
  }
}
