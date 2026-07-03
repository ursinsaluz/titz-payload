# titz-payload — Project Context

titz.cooking Variante mit Payload CMS 3.0 und Next.js. Deployed auf Cloudflare.
Experimentelles Projekt parallel zu `titz-emdash`.

## Tech Stack
- **Framework:** Next.js (App Router)
- **CMS:** Payload CMS 3.0
- **Hosting:** Cloudflare
- **DB:** Cloudflare D1 (via Payload Cloudflare adapter)

## Struktur
- `src/app/` — Next.js App Router pages
- `src/collections/` — Payload Collection definitions
- `src/migrations/` — DB Migrations
- `payload.config.ts` — Payload Konfiguration
- `payload-types.ts` — Generierte Typen (nicht manuell editieren)

## Commands
```bash
npm run dev       # Dev server
npm run generate:types  # Payload Typen regenerieren
npm run payload migrate  # Migrationen ausführen
```

## Hinweis
Dieses Projekt ist ein Experiment / Vergleich zu `titz-emdash` (EmDash Stack).
Payload CMS vs. EmDash CMS — beide auf Cloudflare.

## Entwicklungsphasen (Referenz)
Für neue Features: `/vision` → `/solution-design` → `/mvp-plan` → `/go-live`
Detailliertes Framework in `~/.gemini/GEMINI.md`.
