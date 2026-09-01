# Frontend

Astro 7, statischer Build (`output: 'static'`). Cloudflare Worker
`titz-payload-web` auf `titz.cooking`, ausgeliefert über Workers Assets.

Die verbindlichen Anweisungen stehen eine Ebene höher:
[AGENTS.md](../../AGENTS.md). Zur Designsprache:
[DESIGN.md](../../DESIGN.md).

## Loslegen

```bash
pnpm dev:web    # http://localhost:4321 — braucht das CMS auf :3000
```

Ohne laufendes CMS gegen Produktion arbeiten:

```bash
PAYLOAD_URL=https://admin.titz.cooking pnpm --filter @titz/web build
```

`PAYLOAD_URL` wird beim Build eingebacken und ist **optional**: Ohne Angabe
entscheidet der Modus — `astro dev` nimmt `http://localhost:3000`, `astro build`
nimmt `https://admin.titz.cooking`. Laufzeit-`vars` in `wrangler.jsonc` haben
hier keine Wirkung; bei einem Worker, der nur statische Assets ausliefert, gibt
es keine Laufzeit.

Die Variable **nicht** dauerhaft in `.env` setzen. Eine Zeile
`PAYLOAD_URL=http://localhost:3000` dort lässt jeden Build gegen das lokale CMS
laufen: Ohne CMS bricht er mit «fetch failed» ab, mit CMS deployt
`pnpm deploy:web` still lokalen Inhalt nach Produktion. Das `deploy`-Skript
setzt die Prod-Adresse deshalb selbst.

## Was hier drin liegt

```
src/
  pages/        index.astro, [slug].astro, 404.astro
  layouts/      Base.astro — SEO, Fonts, Header/Footer, Egg-Daten
  components/   Header, Footer, Stage, SectionRenderer, Icon, IconCircle, Egg
    sections/   eine Komponente je Block aus dem CMS
  lib/          payload.ts (Datenschicht), schemas.ts (Zod),
                blocks.ts (Block-Typen), lexical.ts (RichText → HTML),
                links.ts (Navigationsziele)
  scripts/      playful.ts — Spirale, Scroll-Reveal, Gemüse-Easter-Egg
  styles/       global.css — Tokens und Animationen
public/         favicon, Logo, _headers
tests/          Playwright-Smoke-Tests gegen den fertigen Build
```

## Datenschicht

`lib/payload.ts` holt alles über REST. Die Slugs sind über
`Config['collections']` und `Config['globals']` aus
[`@titz/types`](../../packages/types) typisiert: `getGlobal('header')` liefert
einen `Header`, ein Tippfehler im Slug ist ein Typfehler.

`lib/schemas.ts` prüft jede Antwort mit Zod und bricht den Build ab, wenn ein
Feld fehlt, das eine Seite braucht. Neue Pflichtfelder dort ergänzen.

Während des Builds werden Antworten pro Pfad zwischengespeichert — sonst fragt
jede Seite Header, Footer, Settings und Icon-Liste erneut ab.

## Prüfen

```bash
pnpm --filter @titz/web check    # astro check
pnpm --filter @titz/web lint     # ESLint, inklusive .astro
pnpm --filter @titz/web build    # der eigentliche Integrationstest
pnpm --filter @titz/web test     # Playwright gegen dist/
```

Die Smoke-Tests brauchen ein gebautes `dist/`. Sie starten den Preview-Server
selbst über `tests/globalSetup.ts` — Astro legt `preview` ab Version 7 in den
Hintergrund, `astro preview stop` beendet ihn.
