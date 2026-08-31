# titz.cooking

Website für Sebastian Titz, Chefkoch im Restaurant PINOT in Fläsch.
Payload CMS als Backend, Astro als Frontend, beides auf Cloudflare Workers.

```
apps/
  cms/    Payload 3 auf Next.js — Admin-UI und REST-API
          Worker «titz-payload-admin» → admin.titz.cooking
          Daten in D1 «titz-payload-site», Dateien in R2 «titz-payload-media»
  web/    Astro — statische Seite, holt den Content beim Build über REST
          Worker «titz-payload-web» → titz.cooking
packages/
  types/  Das generierte Content-Modell, von beiden Apps benutzt
```

## Loslegen

```bash
pnpm install
npx wrangler login    # ohne Login kommt das CMS nicht an D1 und R2
pnpm dev              # CMS auf :3000/admin, Astro auf :4321
```

Es braucht **keine** Datenbank-Einrichtung. Miniflare legt beim ersten
`pnpm dev:cms` eine lokale D1 unter `apps/cms/.wrangler/` an und schreibt das
Schema direkt aus der Konfiguration hinein. Die lokale Datenbank ist leer —
`pnpm seed` füllt sie mit dem Inhalt von titz.cooking.

Damit das Frontend lokal Content bekommt, muss das CMS laufen. Ohne CMS gegen
Produktion bauen:

```bash
PAYLOAD_URL=https://admin.titz.cooking pnpm --filter @titz/web build
```

## Befehle

Alle im Wurzelverzeichnis.

| Befehl                | Was es tut                                                            |
| --------------------- | --------------------------------------------------------------------- |
| `pnpm dev`            | CMS und Frontend parallel                                             |
| `pnpm build`          | beide Apps bauen                                                      |
| `pnpm verify`         | die komplette Kette: Secrets, Format, Lint, Typen, Build, Smoke-Tests |
| `pnpm check`          | nur Typen (`tsc --noEmit` + `astro check`)                            |
| `pnpm lint`           | ESLint in beiden Apps                                                 |
| `pnpm format`         | Prettier schreibend, `format:check` nur prüfend                       |
| `pnpm test`           | Unit-Tests (CMS) und Smoke-Tests (Frontend)                           |
| `pnpm security:scan`  | sucht Zugangsdaten im Repo — läuft auch als pre-commit-Hook           |
| `pnpm generate:types` | Cloudflare-, Payload- und geteilte Typen neu erzeugen                 |
| `pnpm migrate:status` | Migrationsstand lokal, `:prod` gegen die echte Datenbank              |
| `pnpm seed`           | Datenbank mit dem Inhalt von titz.cooking füllen                      |
| `pnpm deploy:cms`     | Migrationen **und** Worker deployen                                   |
| `pnpm deploy:web`     | Frontend bauen und deployen                                           |

## Content-Modell

**Globals** — `header` (Navigation, Logo, Stage/Hero), `footer` (Kontakt,
Social-Links, rechtliche Links), `site-settings` (SEO-Standards,
Easter-Egg-Texte).

**Collections** — `pages` (Sektionen als Blocks), `news`, `angebote`,
`signature-dishes`, `stationen` (Lebenslauf), `icons` (SVG-Bibliothek mit
Toast-Sprüchen), `media`, `users`.

Nach jeder Änderung am Modell: `pnpm generate:types`. Das schreibt
`apps/cms/src/payload-types.ts` und kopiert es nach `packages/types` — beide
Apps prüfen dagegen.

## Veröffentlichen

Das Frontend ist statisch. Eine Änderung im Admin ist erst nach einem Rebuild
sichtbar, und den stösst Payload selbst an:
`apps/cms/src/hooks/rebuildWeb.ts` ruft den Deploy-Hook des Workers
`titz-payload-web`. Dafür braucht der CMS-Worker das Secret
`WEB_DEPLOY_HOOK_URL`. Entwürfe lösen nichts aus, Löschen schon.

Ausführlich, samt Caching-Ebenen und der Begründung gegen SSR:
[ARCHITECTURE.md](ARCHITECTURE.md).

## Migrationen

Lokal gibt es keine Migrationen — der D1-Adapter schreibt das Schema im
Entwicklungsmodus direkt aus der Konfiguration. Für Produktion:

```bash
pnpm --filter @titz/cms exec payload migrate:create beschreibender_name
pnpm migrate:status:prod     # zeigt, was noch aussteht
pnpm deploy:cms              # migriert und deployt
```

> **Ein Push auf `main` migriert nicht.** Cloudflare Workers Builds baut und
> deployt bei jedem Push, führt aber keine Migrationen aus. Wer das Schema
> geändert hat, deployt mit `pnpm deploy:cms` — sonst läuft der neue Code gegen
> das alte Schema.

## MCP

Das CMS stellt seinen Inhalt unter `/api/mcp` bereit. `.mcp.json` im
Wurzelverzeichnis registriert zwei Server: `payload` gegen den lokalen
Dev-Server, `payload-prod` gegen admin.titz.cooking.

Schlüssel im Admin unter **System → MCP-Schlüssel** anlegen — je Umgebung einen
eigenen. Die Werte gehören in die **Umgebung**, nicht ins Repo und nicht in eine
`.env`: `.mcp.json` expandiert `${…}` aus den Umgebungsvariablen der Sitzung.

```bash
# ~/.zshrc
export PAYLOAD_MCP_TOKEN=…        # lokaler Dev-Server
export PAYLOAD_MCP_TOKEN_PROD=…   # admin.titz.cooking
```

Alternativ projektbezogen in `.claude/settings.local.json` (ist ignoriert):

```json
{ "env": { "PAYLOAD_MCP_TOKEN": "…", "PAYLOAD_MCP_TOKEN_PROD": "…" } }
```

Nachprüfen, ob der Wert wirklich ankommt — eine `.env` reicht **nicht**:

```bash
printenv PAYLOAD_MCP_TOKEN_PROD    # leer = der MCP-Server kann sich nicht anmelden
```

> `payload-prod` schreibt in den **Live-Inhalt**. Jede Änderung darüber löst den
> Rebuild-Hook aus und geht auf titz.cooking. Wer nur lesen will, nimmt den
> lokalen Server.

## Weiterlesen

- [AGENTS.md](AGENTS.md) — verbindliche Anweisungen für die Arbeit am Repo
- [ARCHITECTURE.md](ARCHITECTURE.md) — Entscheidungen und ihre Gründe
- [DESIGN.md](DESIGN.md) — die Designsprache «Verspielt»
- [apps/cms/README.md](apps/cms/README.md) · [apps/web/README.md](apps/web/README.md)
