/**
 * Das Content-Modell des CMS, für beide Apps.
 *
 * `apps/web` deklarierte seine Interfaces vorher selbst — `Page`,
 * `SiteSettings`, `Media`, `Icon` — mit `as never`-Casts an den Übergängen.
 * Ein Feld, das im CMS wegfiel oder dazukam, blieb dabei stumm: Astro rendert
 * die Sektion einfach leer und der Build ist grün.
 *
 * `payload.ts` in diesem Ordner ist erzeugt, nicht von Hand geschrieben:
 * `pnpm generate:types` im CMS schreibt `apps/cms/src/payload-types.ts` und
 * kopiert es hierher. Beim Kopieren fällt der `declare module 'payload'`-Block
 * weg — die Augmentierung braucht das Paket `payload`, und das hat `apps/web`
 * nicht.
 */
export type * from './payload'
