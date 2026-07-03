const PAYLOAD_URL = import.meta.env.PAYLOAD_URL ?? 'http://localhost:3000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${PAYLOAD_URL}/api${path}`)
  if (!res.ok) {
    throw new Error(`Payload request failed: ${res.status} ${path}`)
  }
  return res.json() as Promise<T>
}

export interface Media {
  id: number
  url: string
  alt?: string
  filename?: string
}

export interface Icon {
  id: number
  name: string
  svg?: string
  url?: string
  toasts?: { text: string }[]
}

export type IconRef = number | Icon | null | undefined

export async function getGlobal<T = Record<string, unknown>>(slug: string): Promise<T> {
  return get<T>(`/globals/${slug}?depth=2`)
}

export async function getCollection<T = Record<string, unknown>>(
  slug: string,
  query = '',
): Promise<T[]> {
  const data = await get<{ docs: T[] }>(`/${slug}?depth=2&limit=100&pagination=false${query}`)
  return data.docs
}

export async function getPageBySlug<T = Record<string, unknown>>(slug: string): Promise<T | null> {
  const data = await get<{ docs: T[] }>(`/pages?depth=2&where[slug][equals]=${encodeURIComponent(slug)}`)
  return data.docs[0] ?? null
}

/** Alle Icons einmal laden; Sektionen lösen Icon-Referenzen darüber auf.
    Nur im Build cachen — im Dev-Server würde der Modul-Cache Reseeds überleben. */
let iconCache: Map<number, Icon> | null = null
export async function getIcons(): Promise<Map<number, Icon>> {
  if (!iconCache || import.meta.env.DEV) {
    const icons = await getCollection<Icon>('icons')
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
  const settings = await getGlobal<{
    easterEggs?: { completionToast?: string; starToast?: string }
  }>('site-settings')
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
