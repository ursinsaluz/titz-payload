# titz.cooking — Monorepo

Website für Sebastian Titz: Payload CMS (Backend/Admin) + Astro (Frontend).

## Struktur

```
apps/
  cms/   Payload 3 auf Next.js — Admin-UI + REST API, Cloudflare Workers (D1 + R2, OpenNext)
  web/   Astro-Frontend — holt Content aus Payload, Cloudflare Workers/Assets
```

## Entwicklung

```bash
pnpm install
pnpm dev:cms    # Payload Admin auf http://localhost:3000/admin
pnpm dev:web    # Astro auf http://localhost:4321
```

## Content-Model (Payload)

- **Globals:** `header` (Navigation + Stage/Hero), `footer`, `site-settings` (SEO-Defaults)
- **Collections:** `pages` (Sektionen als Blocks: Philosophie … Aktuelles), `news`, `angebote`,
  `signature-dishes`, `stationen`, `icons` (SVG-Assets, per Dropdown referenzierbar), `media`, `users`

## Seed

```bash
pnpm seed   # befüllt Payload mit dem Content von titz.cooking
```

## Deployment (Cloudflare)

```bash
pnpm deploy:cms   # OpenNext → Workers (D1-Migrationen inklusive)
pnpm deploy:web   # Astro → Workers/Assets
```
