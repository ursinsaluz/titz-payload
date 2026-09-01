# CMS

Payload 3 auf Next.js 16, über OpenNext als Cloudflare Worker
`titz-payload-admin` auf `admin.titz.cooking`. Inhalt in D1
`titz-payload-site`, Dateien in R2 `titz-payload-media`.

Die verbindlichen Anweisungen stehen eine Ebene höher:
[AGENTS.md](../../AGENTS.md). Warum es so gebaut ist:
[ARCHITECTURE.md](../../ARCHITECTURE.md).

## Loslegen

```bash
pnpm install         # im Wurzelverzeichnis
npx wrangler login   # ohne Login gibt es keinen Zugriff auf D1 und R2
pnpm dev:cms         # http://localhost:3000/admin
```

Miniflare legt die lokale Datenbank beim ersten Start selbst an. `pnpm seed`
füllt sie.

## Was hier drin liegt

```
src/
  collections/   users, media, icons, pages, news, angebote,
                 signature-dishes, stationen
  globals/       Header (Navigation + Stage), Footer, SiteSettings
  fields/        wiederverwendete Felder: link, seo, iconSelect
  hooks/         rebuildWeb — stösst den Frontend-Build an
  uploads/       Cache-Kopfzeile für ausgelieferte Dateien
  migrations/    nur für Produktion, lokal wird das Schema geschoben
  seed/          Inhalt von titz.cooking, Assets im Repo
  app/(payload)/ Admin-UI und REST-API von Payload
scripts/
  repairProd.ts        repariert Dateien in Produktion, ohne Inhalt anzufassen
  syncSharedTypes.mjs  kopiert die Typen nach packages/types
tests/unit/      Vitest, reine Logik ohne Datenbank
```

`/` leitet über `next.config.ts` auf `/admin` um. GraphQL ist abgeschaltet.

## Vier Dinge, die man wissen muss

**Der Build läuft mit webpack, nicht mit Turbopack.** Next 16 baut standardmässig
mit Turbopack; OpenNext kann dessen Chunks nicht bündeln — im Output steht ein
`require("typescript-<hash>")`, das esbuild nicht auflöst, und
`opennextjs-cloudflare build` bricht ab. Darum `next build --webpack` im
`build`-Skript. Der `webpack`-Block in `next.config.ts` (extensionAlias) wird
von Turbopack ohnehin nicht gelesen.

**Lokal gibt es keine Migrationen.** Der D1-Adapter schreibt das Schema im
Entwicklungsmodus direkt aus der Konfiguration; `payload_migrations` enthält
lokal nur den Eintrag `dev`. Eine Migration läuft das erste Mal überhaupt gegen
Produktion — vorher `pnpm migrate:status:prod` und die SQL lesen.

**Ein Push auf `main` migriert nicht.** Workers Builds führt nur
`build:cloudflare` aus. Nach einer Schemaänderung `pnpm deploy:cms`.

**`pnpm seed` niemals gegen Produktion.** Er räumt Collections ab. Für
Reparaturen `scripts/repairProd.ts` — der fasst nur Dateien an und schreibt
erst mit `REPAIR_APPLY=1`.

**`pnpm dev:remote` hängt an der Produktionsdatenbank.** Gedacht für Prod-Inhalt
über MCP, weil der MCP-Endpunkt nur im Node-Prozess läuft. Jede Änderung ist
eine echte Änderung.

## Befehle

```bash
pnpm dev:cms                             # Dev-Server
pnpm --filter @titz/cms build            # next build
pnpm --filter @titz/cms test             # Unit-Tests
pnpm --filter @titz/cms lint             # ESLint
pnpm generate:types                      # Cloudflare-, Payload- und geteilte Typen
pnpm migrate:status / :prod              # Migrationsstand
pnpm --filter @titz/cms exec payload migrate:create name
pnpm deploy:cms                          # Migrationen und Worker
```

Die `pnpm …`-Namen mit Präfix gibt es nur im Wurzelverzeichnis. Aus `apps/cms`
heraus heisst das Deployen `pnpm deploy` — `deploy:cms` findet pnpm dort nicht.

## Secrets

Zur Laufzeit als Worker-Secret, nicht in `vars`:

```bash
wrangler secret put PAYLOAD_SECRET        # openssl rand -hex 32
wrangler secret put WEB_DEPLOY_HOOK_URL   # Deploy-Hook des Web-Workers
```

Lokal in `.env` — siehe `.env.example`. Die Datei ist ignoriert; das Repo ist
öffentlich.
