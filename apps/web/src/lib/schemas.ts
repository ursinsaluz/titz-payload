import { z } from 'zod'
import type {
  Angebote,
  Config,
  Header,
  Footer,
  Icon,
  News,
  Page,
  SignatureDish,
  SiteSetting,
  Stationen,
} from '@titz/types'

/**
 * Der Türsteher zwischen CMS und Build.
 *
 * TypeScript prüft, was das Content-Modell *verspricht*. Über die REST-API kommt
 * aber irgendwann etwas anderes zurück, als das generierte Modell behauptet —
 * ein umbenanntes Feld, ein Global, das noch nie gespeichert wurde, eine
 * Migration, die nur halb durchlief. Ohne Prüfung rendert Astro daraus eine
 * Seite mit leeren Sektionen, der Build ist grün, und das Deployment geht durch.
 *
 * Diese Schemata prüfen darum genau das, ohne das die Seite kaputt wäre — nicht
 * das ganze Modell. Ein handgepflegtes Duplikat von 1500 Zeilen generierten
 * Typen würde für sich driften und nichts absichern.
 *
 * Zwei Dinge sind hier wichtig:
 *
 *  1. `pruefe` gibt die **Originaldaten** zurück, nicht das Parse-Ergebnis.
 *     `z.object` streift unbekannte Felder ab; genau die braucht das Frontend
 *     aber. Das Schema wird also nur zum Werfen benutzt.
 *  2. `ModelleErfuellenSchemata` am Dateiende bindet jedes Schema an das
 *     generierte Modell. Verlangt ein Schema ein Feld, das im CMS nicht mehr
 *     existiert, bricht der Typcheck — nicht erst der Build gegen ein
 *     laufendes CMS.
 */

/** Bricht den Typcheck, wenn das generierte Modell dem Schema nicht genügt. */
type Erfuellt<Modell extends Schema, Schema> = Modell

const navEintrag = z.object({ label: z.string() })

export const siteSettingsSchema = z.object({ siteName: z.string() })

// `stage.headline` ist die H1 der Startseite — fehlt sie, ist die Seite kaputt.
export const headerSchema = z.object({
  stage: z.object({ headline: z.string() }),
  nav: z.array(navEintrag).nullish(),
})

export const footerSchema = z.object({
  legalLinks: z.array(navEintrag).nullish(),
})

export const pageSchema = z.object({
  title: z.string(),
  slug: z.string(),
  sections: z.array(z.object({ blockType: z.string() })).nullish(),
})

export const newsSchema = z.object({
  title: z.string(),
  date: z.string(),
  excerpt: z.string(),
})

export const angeboteSchema = z.object({ title: z.string() })

export const signatureDishSchema = z.object({ name: z.string() })

export const stationenSchema = z.object({ title: z.string(), group: z.string() })

// `svg` ist der Inhalt, den `Icon.astro` inline ausgibt. Ohne den Namen findet
// das Easter Egg im Browser sein Icon nicht.
export const iconSchema = z.object({ name: z.string() })

export const mediaSchema = z.object({ alt: z.string() })

/** Welches Schema für welchen Slug. Nicht jede Collection braucht eines —
    `users` liest das Frontend nie, technische Collections auch nicht. */
export const collectionSchemas = {
  pages: pageSchema,
  news: newsSchema,
  angebote: angeboteSchema,
  'signature-dishes': signatureDishSchema,
  stationen: stationenSchema,
  icons: iconSchema,
  media: mediaSchema,
} satisfies Partial<Record<keyof Config['collections'], z.ZodType>>

export const globalSchemas = {
  header: headerSchema,
  footer: footerSchema,
  'site-settings': siteSettingsSchema,
} satisfies Record<keyof Config['globals'], z.ZodType>

/**
 * Prüft und gibt die Originaldaten zurück — siehe Punkt 1 oben.
 *
 * Die Fehlermeldung nennt Pfad und Grund, weil sie im Build-Log von Workers
 * Builds landet und dort die einzige Spur ist.
 */
export function pruefe<T>(schema: z.ZodType | undefined, daten: unknown, wo: string): T {
  if (!schema) return daten as T
  const ergebnis = schema.safeParse(daten)
  if (!ergebnis.success) {
    const probleme = ergebnis.error.issues
      .map((problem) => `${problem.path.join('.') || '(Wurzel)'}: ${problem.message}`)
      .join('; ')
    throw new Error(
      `CMS-Antwort passt nicht zum Content-Modell (${wo}): ${probleme}. ` +
        `Entweder ist das Modell im CMS geändert worden, ohne dass ` +
        `apps/web/src/lib/schemas.ts nachgezogen wurde, oder der Datensatz ist unvollständig.`,
    )
  }
  return daten as T
}

/**
 * Die Bindung ans generierte Modell, gesammelt an einer Stelle.
 *
 * Jeder Eintrag ist eine Behauptung: «Das Modell aus dem CMS erfüllt dieses
 * Schema.» Wird ein Feld im CMS umbenannt oder optional, schlägt hier der
 * Typcheck fehl und nennt die Zeile — statt dass der Build erst gegen ein
 * laufendes CMS auffällt. Exportiert, weil ein ungenutzter Typalias sonst
 * nur eine Warnung wäre, die man wegräumt.
 */
export type ModelleErfuellenSchemata = [
  Erfuellt<SiteSetting, z.infer<typeof siteSettingsSchema>>,
  Erfuellt<Header, z.infer<typeof headerSchema>>,
  Erfuellt<Footer, z.infer<typeof footerSchema>>,
  Erfuellt<Page, z.infer<typeof pageSchema>>,
  Erfuellt<News, z.infer<typeof newsSchema>>,
  Erfuellt<Angebote, z.infer<typeof angeboteSchema>>,
  Erfuellt<SignatureDish, z.infer<typeof signatureDishSchema>>,
  Erfuellt<Stationen, z.infer<typeof stationenSchema>>,
  Erfuellt<Icon, z.infer<typeof iconSchema>>,
]
