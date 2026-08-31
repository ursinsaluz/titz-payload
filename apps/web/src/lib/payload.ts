/** Die CMS-Adresse wird beim Build eingebacken — danach läuft für titz.cooking
    kein Code mehr. `vars` in wrangler.jsonc sind Laufzeit-Bindings und
    erreichen `import.meta.env` deshalb nie; die Variable muss aus `.env` oder
    den Build-Variablen von Workers Builds kommen. Fällt sie im Produktivbuild
    aus, zeigt die Seite sonst still auf localhost — darum dort ein Standard,
    der stimmt. */
const PAYLOAD_URL =
  import.meta.env.PAYLOAD_URL ??
  (import.meta.env.PROD ? 'https://admin.titz.cooking' : 'http://localhost:3000')

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

export function mediaUrl(media: Media | number | null | undefined): string | null {
  if (media == null || typeof media === 'number') return null
  if (!media.url) return null
  return media.url.startsWith('http') ? media.url : `${PAYLOAD_URL}${media.url}`
}
