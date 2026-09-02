/** Die CMS-Adresse wird beim Build eingebacken — danach läuft für titz.cooking
    kein Code mehr. `vars` in wrangler.jsonc sind Laufzeit-Bindings und
    erreichen `import.meta.env` deshalb nie; die Variable muss aus `.env` oder
    den Build-Variablen von Workers Builds kommen. Fällt sie im Produktivbuild
    aus, zeigt die Seite sonst still auf localhost — darum dort ein Standard,
    der stimmt. */
// `||` und nicht `??`: Eine nicht gesetzte GitHub-Variable kommt als leerer
// String an, nicht als undefined. Mit `??` hat der Build daraus eine relative
// Adresse gemacht und mit «Failed to parse URL» abgebrochen.
const PAYLOAD_URL =
  import.meta.env.PAYLOAD_URL ||
  (import.meta.env.PROD ? 'https://admin.titz.cooking' : 'http://localhost:3000')

/** Die Herkunft, von der die Bilder kommen — Base.astro baut daraus den
    Preconnect. Exportiert, damit die Adresse nur an einer Stelle steht. */
export const PAYLOAD_ORIGIN = PAYLOAD_URL

import type { Config, Icon, Media, Page } from '@titz/types'

import { collectionSchemas, globalSchemas, pageSchema, pruefe } from './schemas'

/** Die Slug-Landkarte aus dem generierten Content-Modell. Damit liefert
    `getGlobal('header')` einen `Header` und kein `Record<string, unknown>` —
    und ein Tippfehler im Slug ist ein Typfehler, kein leeres Objekt. */
type Collections = Config['collections']
type Globals = Config['globals']

export type { Icon, Media, Page }

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${PAYLOAD_URL}/api${path}`)
  if (!res.ok) {
    throw new Error(`Payload request failed: ${res.status} ${path}`)
  }
  return res.json() as Promise<T>
}

/** Jede Seite wird im Build einzeln gerendert und fragt dabei dieselben Daten
    erneut ab — Header, Footer, Site-Settings und die Icon-Liste stehen auf
    jeder Seite. Der Cache spart diese Runden gegen das CMS.
    Es wird das Promise gespeichert, nicht erst das Ergebnis: Sonst starten
    parallel gerenderte Seiten dieselbe Abfrage mehrfach, bevor die erste
    zurück ist. Im Dev-Server aus, dort würde der Modul-Cache einen Reseed
    überleben. */
const responseCache = new Map<string, Promise<unknown>>()

function get<T>(path: string): Promise<T> {
  if (import.meta.env.DEV) return fetchJson<T>(path)
  const cached = responseCache.get(path)
  if (cached) return cached as Promise<T>
  // Fehlgeschlagene Abfragen nicht behalten, sonst bricht der ganze Build an
  // einem einzelnen Aussetzer des CMS.
  const pending = fetchJson<T>(path).catch((fehler) => {
    responseCache.delete(path)
    throw fehler
  })
  responseCache.set(path, pending)
  return pending
}

export type IconRef = number | Icon | null | undefined

export async function getGlobal<S extends keyof Globals>(slug: S): Promise<Globals[S]> {
  const data = await get<unknown>(`/globals/${String(slug)}?depth=2`)
  return pruefe<Globals[S]>(globalSchemas[slug], data, `Global «${String(slug)}»`)
}

export async function getCollection<S extends keyof Collections>(
  slug: S,
  query = '',
): Promise<Collections[S][]> {
  const data = await get<{ docs: unknown[] }>(
    `/${String(slug)}?depth=2&limit=100&pagination=false${query}`,
  )
  const schema = (collectionSchemas as Record<string, Parameters<typeof pruefe>[0]>)[String(slug)]
  return data.docs.map((doc, index) =>
    pruefe<Collections[S]>(schema, doc, `${String(slug)}[${index}]`),
  )
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  // Auf `published` einschränken wie in [slug].astro: Ohne Filter liefert
  // Payload auch einen Entwurf, und der ginge beim nächsten Build live.
  const data = await get<{ docs: unknown[] }>(
    `/pages?depth=2&where[slug][equals]=${encodeURIComponent(slug)}&where[_status][equals]=published`,
  )
  const doc = data.docs[0]
  return doc === undefined ? null : pruefe<Page>(pageSchema, doc, `Seite «${slug}»`)
}

/** Alle Icons einmal laden; Sektionen lösen Icon-Referenzen darüber auf.
    Nur im Build cachen — im Dev-Server würde der Modul-Cache Reseeds überleben. */
let iconCache: Map<number, Icon> | null = null
export async function getIcons(): Promise<Map<number, Icon>> {
  if (!iconCache || import.meta.env.DEV) {
    const icons = await getCollection('icons')
    iconCache = new Map(icons.map((icon) => [icon.id, icon]))
  }
  return iconCache
}

/** Easter-Egg-Daten fürs Frontend: Toast-Sprüche pro Icon + Spezial-Toasts. */
export async function getEggData() {
  const icons = await getIcons()
  const toasts: Record<string, string[]> = {}
  for (const icon of icons.values()) {
    if (icon.toasts?.length) {
      toasts[icon.name] = icon.toasts.map((toast) => toast.text)
    }
  }
  const settings = await getGlobal('site-settings')
  return {
    toasts,
    total: Object.keys(toasts).length,
    completionToast: settings.easterEggs?.completionToast ?? '',
    starToast: settings.easterEggs?.starToast ?? '',
  }
}

export async function getIconByName(name: string): Promise<Icon | null> {
  const icons = await getIcons()
  for (const icon of icons.values()) {
    if (icon.name === name) return icon
  }
  return null
}

export async function resolveIcon(ref: IconRef): Promise<Icon | null> {
  if (ref == null) return null
  if (typeof ref === 'object') return ref
  const icons = await getIcons()
  return icons.get(ref) ?? null
}

/**
 * Cloudflares Bildtransformation, hinter einem Schalter.
 *
 * Auf Workers gibt es kein `sharp`, Payload kann also keine Bildvarianten
 * erzeugen: Was hochgeladen wurde, wird ausgeliefert. In der Mediathek liegen
 * rund 130 Aufnahmen mit 2560 px und 0,4 bis 2,2 MB — ein Archiv, und als
 * Archiv richtig. Nur darf davon nichts unverkleinert auf die Seite.
 *
 * Cloudflare kann das am Rand lösen: `/cdn-cgi/image/<optionen>/<url>` liefert
 * dieselbe Datei verkleinert und in AVIF oder WebP, je nachdem, was der
 * Browser kann. Das Original bleibt unangetastet.
 *
 * **Der Schalter ist aus, bis die Funktion in der Zone aktiviert ist.** Ist sie
 * es nicht, antwortet der Pfad mit einem Fehler — und dann wäre nicht ein Bild
 * kaputt, sondern jedes. Aktivieren: Cloudflare-Dashboard → Zone
 * `titz.cooking` → Images → Transformations → «Enable for zone». Danach
 * `IMAGE_TRANSFORM=1` in die Build-Variablen von Workers Builds, und die
 * Grössenangaben unten greifen.
 */
const TRANSFORM = import.meta.env.IMAGE_TRANSFORM === '1'

/**
 * Die Adresse eines Bildes, optional auf eine Darstellungsbreite gebracht.
 *
 * `breite` ist die Breite in CSS-Pixeln, in der das Bild erscheint — die
 * Funktion verdoppelt selbst für Displays mit hoher Dichte. Ohne Angabe bleibt
 * es beim Original, das ist der Standard für alles, was ungeprüft durchläuft.
 */
export function mediaUrl(
  media: Media | number | null | undefined,
  optionen?: { breite?: number },
): string | null {
  if (media == null || typeof media === 'number') return null
  if (!media.url) return null

  const voll = media.url.startsWith('http') ? media.url : `${PAYLOAD_URL}${media.url}`
  if (!TRANSFORM || !optionen?.breite) return voll

  // `format=auto` gibt AVIF, wo der Browser es annimmt, sonst WebP.
  // `fit=scale-down` vergrössert nie — ein kleines Original bleibt klein.
  const optionenPfad = [
    `width=${Math.round(optionen.breite * 2)}`,
    'format=auto',
    'quality=82',
    'fit=scale-down',
  ].join(',')

  const u = new URL(voll)
  return `${u.origin}/cdn-cgi/image/${optionenPfad}${u.pathname}${u.search}`
}
