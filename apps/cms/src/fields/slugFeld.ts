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
        // Von Hand gesetzt gewinnt immer, auch beim Anlegen.
        if (typeof value === 'string' && value.trim()) return slugify(value)

        // Beim Aktualisieren den bestehenden behalten. Ohne diese Zeile bekäme
        // ein Anlass, dessen Titel korrigiert wird, eine neue Adresse.
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
  for (let n = 1; n < 50; n++) {
    const kandidat = n === 1 ? basis : `${basis}-${n}`
    const treffer = await req.payload.find({
      collection,
      where: { slug: { equals: kandidat } },
      limit: 1,
      depth: 0,
      // Entwürfe zählen mit: Ein Entwurf mit diesem Slug wird später
      // veröffentlicht und kollidiert dann.
      draft: true,
    })
    const belegt = treffer.docs.filter((d) => (d as { id?: unknown }).id !== eigeneId)
    if (belegt.length === 0) return kandidat
  }
  // Nach 49 gleichnamigen Einträgen ist etwas anderes falsch als der Slug.
  return `${basis}-${Date.now()}`
}
