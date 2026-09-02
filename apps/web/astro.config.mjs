import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://titz.cooking',
  output: 'static',
  trailingSlash: 'ignore',
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
      serialize: (eintrag) => ({
        ...eintrag,
        // Die Startseite trägt alles Redaktionelle und ändert sich mit jedem
        // Aktuelles-Eintrag; Impressum und Datenschutz praktisch nie.
        changefreq: eintrag.url === 'https://titz.cooking/' ? 'weekly' : 'yearly',
        priority: eintrag.url === 'https://titz.cooking/' ? 1.0 : 0.3,
      }),
    }),
  ],
})
