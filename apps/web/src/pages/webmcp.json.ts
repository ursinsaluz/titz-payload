import type { APIRoute } from 'astro'
import { getCollection, getGlobal } from '../lib/payload'
import { hatLexicalInhalt, lexicalToPlainText } from '../lib/lexical'
import {
  aktuellesPfad,
  aktuellesSlug,
  angebotPfad,
  anlassPfad,
  istKommenderAnlass,
} from '../lib/schema'

/**
 * Statischer Datenindex für die WebMCP-Tools im Browser (`/webmcp.json`).
 *
 * Da `titz.cooking` statisch gebaut wird, bündelt dieser Endpunkt beim Build
 * alle öffentlichen CMS-Inhalte in einer kompakten JSON-Datei. Die im Browser
 * über `navigator.modelContext` / `document.modelContext` registrierten Tools
 * laden diese Datei erst bei Bedarf (lazy) vom selben Origin — ohne Laufzeit-
 * Abhängigkeit vom CMS-Worker.
 */
export const GET: APIRoute = async () => {
  const [header, footer, settings, angebote, events, news, dishes, stationen] = await Promise.all([
    getGlobal('header'),
    getGlobal('footer'),
    getGlobal('site-settings'),
    getCollection('angebote', '&sort=order'),
    getCollection('events', '&sort=datum&where[_status][equals]=published'),
    getCollection('news', '&sort=-date&where[_status][equals]=published'),
    getCollection('signature-dishes', '&sort=order'),
    getCollection('stationen', '&sort=order'),
  ])

  const kommendeAnlaesse = events.filter((e) => istKommenderAnlass(e))

  const daten = {
    person: {
      name: settings.siteName ?? 'Sebastian Titz',
      rolle: 'Küchenchef & Gastgeber',
      betrieb: 'Restaurant PINOT, Steigstrasse 12, 7306 Fläsch',
      headline: header.stage?.headline ?? '',
      subline: header.stage?.subline ?? '',
      auszeichnungen: (header.stage?.badges ?? []).map((b) => b.label).filter(Boolean),
      einsatzgebiet: [
        'Bündner Herrschaft',
        'Sarganserland',
        'Werdenberg',
        'Graubünden',
        'St. Galler Rheintal',
        'Liechtenstein',
        'Ostschweiz',
      ],
      kontakt: {
        email: footer.contact?.email ?? 'info@titz.cooking',
        phone: footer.contact?.phone ?? null,
        address: footer.contact?.address ?? 'Steigstrasse 12, 7306 Fläsch',
      },
    },
    angebote: angebote.map((a) => ({
      slug: a.slug,
      url: angebotPfad(a.slug),
      title: a.title,
      eyebrow: a.eyebrow ?? null,
      beschreibung: lexicalToPlainText(a.description),
      merkmale: (a.features ?? []).map((f) => f.text),
      ctaUrl: a.cta?.url ?? 'mailto:info@titz.cooking',
    })),
    anlaesse: kommendeAnlaesse.map((e) => ({
      slug: e.slug,
      url: anlassPfad(e.slug),
      title: e.title,
      rhythmus: e.rhythmus,
      wochentag: e.wochentag ?? null,
      datum: e.datum ? String(e.datum).slice(0, 10) : null,
      zeit: e.zeit ?? null,
      ort: e.ort ?? null,
      preis: e.preis ?? null,
      excerpt: e.excerpt,
      beschreibung: lexicalToPlainText(e.body),
      menue: (e.menu ?? []).map((g) => g.text),
      ctaUrl: e.cta?.url ?? 'mailto:info@titz.cooking',
    })),
    gerichte: dishes.map((d) => ({
      name: d.name,
      tag: d.tag ?? null,
      description: d.description ?? '',
    })),
    aktuelles: news.map((n) => {
      const eigenerBeitrag = hatLexicalInhalt(n.body)
      const slug = aktuellesSlug(n)
      return {
        slug,
        eigenerBeitrag,
        url: eigenerBeitrag ? aktuellesPfad(slug) : (n.link?.url ?? null),
        title: n.title,
        date: String(n.date).slice(0, 10),
        badge: n.badge ?? null,
        excerpt: n.excerpt,
        inhalt: eigenerBeitrag ? lexicalToPlainText(n.body) : null,
        weiterfuehrenderLink: n.link?.url ?? null,
      }
    }),
    stationen: stationen.map((s) => ({
      group: s.group,
      period: s.period ?? null,
      title: s.title,
      place: s.place ?? null,
      description: s.description ?? null,
      highlights: (s.highlights ?? []).map((h) => h.text),
    })),
  }

  return new Response(JSON.stringify(daten), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}
