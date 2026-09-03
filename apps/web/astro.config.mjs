import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

/**
 * `lastmod` für die Sitemap, aus den echten Zeitstempeln im CMS.
 *
 * `changefreq` und `priority` standen hier vorher und sind ersatzlos
 * entfallen: Google sagt seit Jahren offen, dass es beide ignoriert.
 * `lastmod` ist das einzige Feld, das ausgewertet wird — und für eine
 * statisch gebaute Seite besonders nützlich, weil eine Änderung im Admin
 * erst mit dem nächsten Build sichtbar wird.
 *
 * Die Startseite trägt Inhalt aus sechs Collections; ihr `lastmod` ist das
 * jüngste `updatedAt` daraus. Impressum und Datenschutz tragen ihr eigenes.
 *
 * **Fällt der Abruf aus, entsteht kein `lastmod` und sonst nichts.** Die
 * Konfiguration darf nicht davon abhängen, dass ein CMS erreichbar ist —
 * sonst bricht `astro check` ohne laufenden Server ab.
 */
const PAYLOAD_URL = (process.env.PAYLOAD_URL || 'https://admin.titz.cooking').replace(/\/+$/, '')

/** Die Collections, deren Inhalt auf der Startseite steht. */
const STARTSEITE = ['news', 'events', 'angebote', 'stationen', 'signature-dishes', 'pages']

async function juengstesUpdate(slug) {
  const res = await fetch(`${PAYLOAD_URL}/api/${slug}?limit=1&sort=-updatedAt&depth=0`)
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`)
  const { docs } = await res.json()
  return docs?.[0]?.updatedAt ?? null
}

async function seitenStand() {
  const res = await fetch(
    `${PAYLOAD_URL}/api/pages?limit=100&depth=0&where[_status][equals]=published`,
  )
  if (!res.ok) throw new Error(`pages: HTTP ${res.status}`)
  const { docs } = await res.json()
  return new Map(docs.map((doc) => [doc.slug, doc.updatedAt]))
}

/** Pfad → ISO-Datum. Leer, wenn das CMS nicht antwortet. */
const lastmod = new Map()

try {
  const [stempel, seiten] = await Promise.all([
    Promise.all(STARTSEITE.map(juengstesUpdate)),
    seitenStand(),
  ])

  const juengstes = stempel.filter(Boolean).sort().at(-1)
  if (juengstes) lastmod.set('/', juengstes)

  for (const [slug, stand] of seiten) {
    if (slug !== 'home' && stand) lastmod.set(`/${slug}/`, stand)
  }
} catch (fehler) {
  console.warn(`[sitemap] Kein lastmod — CMS nicht erreichbar: ${fehler.message}`)
}

export default defineConfig({
  site: 'https://titz.cooking',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    /**
     * Der Standard `'auto'` inlined nur Chunks unter 4 KB Rohgrösse. Base.css
     * (6,9 KB) und SectionRenderer.css (10,7 KB) liegen knapp darüber und
     * wurden darum als zwei rendersperrende Anfragen ausgeliefert — zusammen
     * 4,4 KB brotli, für die der Browser zwei Round-Trips auf dem kritischen
     * Pfad ausgibt.
     *
     * Der Einwand gegen `'always'` ist, dass CSS über Seiten hinweg nicht mehr
     * gecacht wird. Bei drei Seiten, von denen praktisch jeder Besuch auf der
     * Startseite beginnt, trägt das nicht. Sobald Angebote und Anlässe eigene
     * URLs haben, ist die Rechnung neu zu stellen.
     */
    inlineStylesheets: 'always',
  },
  integrations: [
    /**
     * Erzeugt `sitemap-index.xml` und `sitemap-0.xml` aus den gebauten Seiten.
     * `robots.txt` in `public/` verweist darauf.
     *
     * Der Nutzen ist bei vier Seiten nicht die Auffindbarkeit — Google findet
     * alles über die interne Verlinkung. Es ist die Messbarkeit: Ohne
     * eingereichte Sitemap zeigt die Search Console keine belastbare
     * Indexierungsübersicht, und damit ist jede weitere Maßnahme unbelegt.
     */
    sitemap({
      filter: (seite) => !seite.includes('/404'),
      i18n: undefined,
      serialize: (eintrag) => {
        const stand = lastmod.get(new URL(eintrag.url).pathname)
        return stand ? { ...eintrag, lastmod: new Date(stand) } : eintrag
      },
    }),
  ],
})
