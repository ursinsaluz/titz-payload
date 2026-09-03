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

  // Der Trenner wird hier normalisiert, nicht angenommen: In der gebauten
  // Fassung stand `…/fit=scale-down//api/media/…` mit doppeltem Schrägstrich,
  // weil `PAYLOAD_URL` aus den Build-Variablen von Workers Builds mit einem
  // endet. Cloudflare verzeiht das, ein anderer Dienst muss es nicht.
  const basis = PAYLOAD_URL.replace(/\/+$/, '')
  const pfad = media.url.startsWith('/') ? media.url : `/${media.url}`
  const voll = media.url.startsWith('http') ? media.url : `${basis}${pfad}`
  if (!TRANSFORM || !optionen?.breite) return voll

  /**
   * AVIF kann Cloudflare nicht **lesen**.
   *
   * Gemessen am 02.09.2026, kurz nachdem die Transformation für die Zone
   * freigeschaltet war: `/cdn-cgi/image/…` antwortet auf eine AVIF-Quelle mit
   * `HTTP 415`, `cf-resized: err=9520` und dem Text «Original image has
   * unsupported format». Drei Bilder auf der Startseite waren damit sofort
   * kaputt — sie zeigten nur noch ihren Alt-Text.
   *
   * AVIF ist als Ausgabe das Ziel, als Eingabe nicht unterstützt. Solche
   * Dateien gehen darum unverändert durch. Das kostet wenig: AVIF ist bereits
   * das sparsamste Format, die drei Dateien liegen bei 20 bis 84 KB.
   *
   * Für neue Uploads heisst das: **JPEG oder WebP, nicht AVIF.** Nur die lassen
   * sich am Rand verkleinern.
   */
  if (media.mimeType === 'image/avif') return voll

  return transformiert(voll, Math.round(optionen.breite * 2))
}

/**
 * Ein `srcset` mit zwei Stufen plus das passende `sizes`.
 *
 * Vorher bekam jedes Gerät dieselbe Datei in doppelter Darstellungsbreite —
 * ein 320-px-Telefon ohne Retina lud 700 px und warf drei Viertel der Pixel
 * weg. Zwei Stufen genügen für diese Kachelgrössen; mehr Einträge kosten
 * Cache-Varianten am Rand, ohne dass ein Gerät davon profitiert.
 *
 * Gibt `null` zurück, wo `mediaUrl` das auch tut — also bei fehlendem Bild,
 * bei abgeschalteter Transformation und bei AVIF-Quellen. Der Aufrufer setzt
 * das Attribut dann nicht, und `src` allein trägt den Fall.
 */
export function mediaSrcSet(
  media: Media | number | null | undefined,
  breite: number,
): { srcset: string; sizes: string } | null {
  if (media == null || typeof media === 'number' || !media.url) return null
  if (!TRANSFORM || media.mimeType === 'image/avif') return null

  const basis = PAYLOAD_URL.replace(/\/+$/, '')
  const pfad = media.url.startsWith('/') ? media.url : `/${media.url}`
  const voll = media.url.startsWith('http') ? media.url : `${basis}${pfad}`

  return {
    srcset: [
      `${transformiert(voll, breite)} ${breite}w`,
      `${transformiert(voll, breite * 2)} ${breite * 2}w`,
    ].join(', '),
    // Die Kacheln haben eine feste Breite und wachsen nicht mit dem Viewport;
    // unterhalb der Kachelbreite füllt das Bild die Spalte.
    sizes: `(max-width: ${breite}px) 100vw, ${breite}px`,
  }
}

/**
 * Das Vorschaubild für Open Graph und Twitter, auf 1200 × 630 zugeschnitten.
 *
 * Das hinterlegte Bild ist ein Portrait (1000 × 1400). `summary_large_image`
 * erwartet 1.91:1 — WhatsApp, LinkedIn und Slack beschneiden sonst selbst,
 * und zwar mittig, sodass vom Gesicht ein Streifen bleibt. `fit=cover`
 * schneidet stattdessen kontrolliert am Rand zu.
 *
 * `gravity=auto` überlässt Cloudflare die Wahl des Ausschnitts; bei einem
 * Portrait trifft das den Kopf zuverlässiger als die Bildmitte.
 *
 * Gibt `zugeschnitten: false` zurück, wenn die Transformation nicht greift —
 * abgeschaltet oder AVIF-Quelle. Dann darf `Base.astro` keine Masse angeben,
 * weil das Bild seine ursprünglichen behält.
 */
export function ogBild(
  media: Media | number | null | undefined,
): { url: string; zugeschnitten: boolean } | null {
  const voll = mediaUrl(media)
  if (!voll) return null
  if (!TRANSFORM || (typeof media === 'object' && media?.mimeType === 'image/avif')) {
    return { url: voll, zugeschnitten: false }
  }
  const u = new URL(voll)
  const optionen = 'width=1200,height=630,fit=cover,gravity=auto,format=auto,quality=80'
  return {
    url: `${u.origin}/cdn-cgi/image/${optionen}${u.pathname}${u.search}`,
    zugeschnitten: true,
  }
}

/** Der `/cdn-cgi/image/`-Pfad für eine konkrete Pixelbreite. */
function transformiert(voll: string, pixel: number): string {
  // `format=auto` gibt AVIF, wo der Browser es annimmt, sonst WebP.
  // `fit=scale-down` vergrössert nie — ein kleines Original bleibt klein.
  //
  // `quality=75` statt 82. Der Gewinn ist kleiner als erwartet — gemessen am
  // 02.09.2026 an den drei grössten Bildern der Startseite bei 700 px:
  //
  //   wine-cabinet   90,8 → 81,8 KB   (−10 %)
  //   wiesner        27,5 → 24,6 KB   (−11 %)
  //
  // AVIF ist bei diesen Motiven schon nahe am Boden; die Qualitätsstufe
  // verschiebt wenig. Der eigentliche Hebel ist das `srcset` darüber: dasselbe
  // Bild bei 350 px wiegt 21,1 statt 81,8 KB. Deshalb bleibt 75 stehen — es
  // kostet nichts Sichtbares —, aber die Erwartung gehört hierher, damit
  // niemand später eine grosse Ersparnis von dieser Zeile erwartet.
  const optionenPfad = [`width=${pixel}`, 'format=auto', 'quality=75', 'fit=scale-down'].join(',')

  const u = new URL(voll)
  // `u.pathname` beginnt mit einem Schrägstrich — ohne dieses Detail entstand
  // `…/fit=scale-down//api/media/…` mit doppeltem Trenner.
  return `${u.origin}/cdn-cgi/image/${optionenPfad}${u.pathname}${u.search}`
}
