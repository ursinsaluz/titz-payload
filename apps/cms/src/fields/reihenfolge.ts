import type { CollectionSlug, NumberField } from 'payload'

/**
 * Das Sortierfeld für die Karten-Sammlungen.
 *
 * Vorher stand in allen drei nur `defaultValue: 0`. Damit bekam jeder neue
 * Eintrag dieselbe Zahl wie ein bereits vorhandener und landete an
 * unvorhersehbarer Stelle — SQLite entscheidet bei gleichem Sortierwert nach
 * eigenem Gutdünken. Wer einen vierten Signature Dish anlegte, fand ihn
 * irgendwo zwischen den ersten drei.
 *
 * Jetzt sucht ein Feld-Hook den höchsten vorhandenen Wert und erhöht ihn um
 * eins: neu kommt hinten.
 *
 * **Warum ein Hook und nicht `defaultValue` als Funktion.** Der D1-Adapter
 * übersetzt ein literales `defaultValue` in einen Spalten-Default. Ersetzt man
 * die 0 durch eine Funktion, verschwindet das `DEFAULT 0` aus dem Schema — und
 * weil SQLite den Default einer Spalte nicht ändern kann, erzeugt Drizzle dafür
 * einen vollständigen Tabellenneubau: `CREATE`, `INSERT … SELECT`, `DROP`,
 * `RENAME`, mit abgeschalteten Foreign Keys. Gemessen für alle drei Sammlungen
 * auf einmal. Diese Migration liefe nach der Regel dieses Projekts das erste
 * Mal überhaupt gegen Produktion — für eine Sortier-Annehmlichkeit ein
 * schlechter Tausch. Der Hook liegt in der Anwendungsschicht und lässt das
 * Schema unberührt.
 */
export const reihenfolge = (slug: CollectionSlug): NumberField => ({
  name: 'order',
  type: 'number',
  label: 'Reihenfolge',
  defaultValue: 0,
  admin: {
    description: 'Kleiner heisst weiter vorn. Neue Einträge kommen von selbst nach hinten.',
  },
  hooks: {
    beforeValidate: [
      async ({ operation, req, value }) => {
        // Nur beim Anlegen und nur, wenn niemand etwas angegeben hat. Eine
        // bewusst gesetzte 0 bleibt eine 0 — sie kommt hier als Wert an,
        // nachdem `defaultValue` gegriffen hat, und ist von «nichts angegeben»
        // nicht zu unterscheiden. Beim Sortieren nach vorn ist die 0 aber
        // ohnehin der Sonderfall, den man von Hand setzt und danach sieht.
        if (operation !== 'create') return value
        if (typeof value === 'number' && value !== 0) return value

        const letzte = await req.payload.find({
          collection: slug,
          sort: '-order',
          limit: 1,
          depth: 0,
        })

        const hoechste = (letzte.docs[0] as { order?: number } | undefined)?.order
        return typeof hoechste === 'number' ? hoechste + 1 : 0
      },
    ],
  },
})
