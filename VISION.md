# Vision & Scope: titz.cooking

> Abgeleitet aus dem umgesetzten Stand v1.0.0 (`README.md`, `ARCHITECTURE.md`, `DESIGN.md`, `AGENTS.md`).

## 1. Einleitung & Zielstellung

`titz.cooking` ist der digitale Auftritt von Sebastian Titz, Küchenchef und Gastgeber im Restaurant PINOT an der Steigstrasse 12 in Fläsch (Bündner Herrschaft, Ostschweiz). Die Seite verbindet den persönlichen kulinarischen Leistungsausweis (Auszeichnungen, Stationen, Signature Dishes) mit der Vermarktung von Beratung für Health- & Lifestyle-Resorts, Catering (10 bis 100 Personen) und Anlässen wie dem Gourmetabend im PINOT.

Gestalterisch folgt das Projekt der Designsprache «Verspielt» (`DESIGN.md`): helle Flächen, Pastell-Chips, selbst gehostete Typografie (`Space Grotesk`) und das Gemüse-Easter-Egg mit 18 entdeckbaren Zutaten. Redaktionelle Inhalte werden eigenständig im Payload CMS gepflegt und lösen über einen Deploy-Hook automatisch einen frischen statischen Build aus.

## 2. Stakeholder & Personas

- **Gäste des Restaurant PINOT:** Suchen Öffnungszeiten, Adresse, Anlässe wie den wöchentlichen Gourmetabend und einen direkten Weg zur Tischreservation (`restaurant-pinot.ch`).
- **Catering- und Beratungskunden:** Organisieren Events in der Region (Bündner Herrschaft, Sarganserland, Werdenberg, Graubünden, St. Galler Rheintal, Liechtenstein, Ostschweiz) oder suchen kulinarische Konzepte für Resorts und nehmen direkt per E-Mail (`info@titz.cooking`) Kontakt auf.
- **Presse und Fachwelt:** Orientieren sich über Stationen, Auszeichnungen, Signature Dishes und aktuelle Medienberichte sowie eigene Beiträge zu lokalen Produzenten.
- **Redaktion (Sebastian Titz / Administration):** Pflegt Seiten, Anlässe, Angebote, Gerichte, Stationen, Aktuelles, Icons und Medien im Admin-Panel (`admin.titz.cooking`) ohne Code-Deployment.
- **KI-Browser und Agenten:** Nutzen die eingebetteten strukturierten Daten (JSON-LD), `/webmcp.json` sowie die vier WebMCP-Werkzeuge im Browser.

## 3. Funktionale Anforderungen (Scope)

- **Startseite & Sektionen:** Modulare Seitenstruktur aus dem CMS (Stage mit Lorbeer-Marke, Philosophie, Signature Dishes, Restaurant PINOT mit Anlässen, Lebenslauf-Stationen, Angebote, Aktuelles) sowie rechtliche Seiten (`/impressum`, `/datenschutz`).
- **Detailseiten:** Eigene statische Seiten für Angebote (`/angebote/<slug>/`), Anlässe (`/anlaesse/<slug>/`) und redaktionelle Beiträge unter Aktuelles (`/aktuelles/<slug>/`).
- **Interaktive Akzente ohne Client-Framework:** Gemüse-Easter-Egg mit Zähler und Toast-Sprüchen aus der Icon-Collection, Scroll-Reveal und Fibonacci-Spirale in Vanilla-TypeScript.
- **WebMCP & SEO:** Statischer Datenindex unter `/webmcp.json`, vier clientseitige WebMCP-Tools (`angebote_und_anlaesse`, `aktuelles_und_artikel`, `profil_und_stationen`, `anfrage_vorbereiten`), dynamisch mit `lastmod` erzeugte Sitemap und JSON-LD-Schema aus CMS-Daten.
- **Headless CMS & Medienverwaltung:** Payload 3 auf Cloudflare Workers mit D1 (`titz-payload-site`), R2 (`titz-payload-media`), Zugriffsschutz für interne und private Bilder (`mediaZugriff.ts`), `send_email`-Binding für Passwort-Resets und automatischem `rebuildWeb`-Hook bei veröffentlichten Änderungen.

## 4. Einschränkungen & Constraints

- **Statisches Frontend:** `apps/web` läuft als reiner statischer Export (`output: 'static'`) auf Cloudflare Workers Assets mit 0 KB Client-Framework; Änderungen aus dem CMS erscheinen nach dem Rebuild durch den Deploy-Hook (~1 Minute).
- **Cloudflare-Plattform:** Kein `sharp` auf Workers (Bilder werden vorab skaliert hochgeladen oder über `/cdn-cgi/image/` am Rand transformiert); TypeScript bleibt auf 5.9 wegen `@astrojs/check` und `typescript-eslint`.
- **Öffentliches Repository:** Zugangsdaten, Secrets und lokale Token gehören nie ins Git-Repository (`scripts/secret-scan.sh` als pre-commit-Hook).
- **Barrierefreiheit & Kontrast:** Gedämpfter Text ausschliesslich über `var(--ink-muted)`, `--gold` abgestimmt auf den dunkelsten verwendeten Hintergrund (`--mint`), Respekt vor `prefers-reduced-motion`.
- **Qualitätssicherung:** Strikte Zod-Schemaprüfung gegen generierte `@titz/types` zur Bauzeit (`ModelleErfuellenSchemata`) sowie automatisierte `pnpm verify`-Kette (Secret-Scan, Prettier, ESLint, Typcheck, Builds, Playwright-Smoke- und UI-Tests).

## 5. Nicht im Scope (Out of Scope)

- **Eigene Buchungs- oder Reservationsplattform:** Tischreservationen verweisen auf externe Systeme (Restaurant PINOT / `aleno.me`); Beratungs- und Catering-Anfragen laufen per `mailto:`.
- **E-Commerce, Shop oder Kunden-Login auf der Website:** Keine Warenkörbe, Zahlungsabwicklung oder Benutzerkonten im öffentlichen Frontend (`apps/web`).
- **Server-Side Rendering (SSR) für `apps/web`:** Bewusst verworfen zugunsten statischer Auslieferung am Rand.
- **GraphQL-API und LLM-Chatbots:** GraphQL ist im CMS deaktiviert (`graphQL: { disable: true }`); es gibt kein serverseitiges KI-Chat-Backend.
