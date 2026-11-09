import type { CollectionSlug, PayloadRequest, TextField } from 'payload'

/**
 * Der Adressbestandteil einer Detailseite, aus dem Titel abgeleitet.
 *
 * Angebote und Anlässe hatten bis zum 03.09.2026 keinen — und damit konnte es
 * für sie keine eigene URL geben. Die ganze Site bestand aus drei Adressen, von
 * denen zwei Impressum und Datenschutz waren; ein einziges Dokument bewarb sich
 * um «Catering Bündner Herrschaft», «Privatkoch Graubünden» und
 * «Gastroberatung Ostschweiz» gleichzeitig, obwohl Title und Description nur
 * eine davon bedienen können.
 *
 * **Umlaute werden ausgeschrieben, nicht entfernt.** «Anlässe» wird zu
 * «anlaesse» und nicht zu «anlsse»; ein Nutzer, der die Adresse vorliest oder
 * abtippt, kommt so an. Schweizer Schreibweise: «ss» statt «ß».
 *
 * **Der Slug wird einmal vergeben und dann nicht mehr angefasst.** Ein Slug,
 * der sich mit dem Titel ändert, bricht jeden Link, den jemand geteilt hat, und
 * wirft die Bewertung der Adresse weg — genau die Ranking-Signale also, für die
 * es die Detailseiten gibt. Wer die Adresse wirklich ändern will, überschreibt
 * das Feld von Hand; dann ist es eine Entscheidung und kein Nebeneffekt einer
 * Titelkorrektur.
 */
export const slugFeld = (collection: CollectionSlug, quelle = 'title'): TextField => ({
  name: 'slug',
  type: 'text',
  label: 'Slug',
  required: true,
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description:
      'Der Teil der Adresse nach dem Sammlungsnamen. Wird beim Anlegen aus dem Titel gebildet und danach nicht mehr geändert — ein neuer Slug bricht geteilte Links.',
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, originalDoc, req, value }) => {
        // Von Hand gesetzt gewinnt, wird aber gegen fremde Kollisionen abgesichert.
        if (typeof value === 'string' && value.trim()) {
          const sauber = slugify(value)
          if (operation === 'update' && originalDoc?.slug === sauber) return sauber
          return eindeutig(sauber, collection, req, originalDoc?.id)
        }

        // Beim Aktualisieren den bestehenden behalten, wenn kein manueller Wert vorliegt.
        if (operation === 'update' && originalDoc?.slug) return originalDoc.slug

        const roh = (data as Record<string, unknown> | undefined)?.[quelle]
        if (typeof roh !== 'string' || !roh.trim()) return value

        return eindeutig(slugify(roh), collection, req, originalDoc?.id)
      },
    ],
  },
})

/** «Gourmetabend im PINOT» → «gourmetabend-im-pinot». */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      // Alles, was keine Kleinbuchstabe und keine Ziffer ist, wird zum Trenner.
      // `normalize('NFD')` davor nimmt Akzente von é, à und Ähnlichem.
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/, '')
  )
}

/**
 * Hängt `-2`, `-3` … an, bis der Slug frei ist.
 *
 * Nötig, weil das Feld `unique` ist: Zwei Anlässe «Gourmetabend» wären sonst
 * ein Datenbankfehler beim Speichern statt einer stillen zweiten Adresse.
 */
async function eindeutig(
  basis: string,
  collection: CollectionSlug,
  req: PayloadRequest,
  eigeneId?: string | number,
): Promise<string> {
  // Eine einzige Abfrage holt alle potenziellen Namenskonflikte.
  const treffer = await req.payload.find({
    collection,
    where: { slug: { like: `${basis}%` } },
    limit: 100,
    depth: 0,
    draft: true,
    req,
  })

  const belegteSlugs = new Set<string>()
  for (const doc of treffer.docs) {
    const d = doc as { id?: unknown; slug?: unknown }
    if (d.id !== eigeneId && typeof d.slug === 'string') {
      belegteSlugs.add(d.slug)
    }
  }

  if (!belegteSlugs.has(basis)) return basis

  for (let n = 2; n < 100; n++) {
    const kandidat = `${basis}-${n}`
    if (!belegteSlugs.has(kandidat)) return kandidat
  }
  return `${basis}-${Date.now()}`
}
