# AGENTS.md

Verbindliche Anweisungen für die Arbeit an diesem Repo. Was das Projekt _ist_,
steht in [README.md](README.md); _warum_ es so gebaut ist, in
[ARCHITECTURE.md](ARCHITECTURE.md).

## Sprache

Code-Bezeichner auf Englisch, wenn sie aus dem Framework kommen
(`getStaticPaths`, `afterChange`). Eigene Fachbegriffe und alles, was im Admin
sichtbar wird, auf Deutsch — Labels, Beschreibungen, Fehlermeldungen. Kommentare
auf Deutsch, mit Umlauten. Schweizer Rechtschreibung: «ss» statt «ß».

Kommentare erklären **warum**, nicht was. Ein Kommentar, der die Zeile unter
ihm nachspricht, wird gelöscht.

## Zehn Dinge, die überraschen

**1. Das Frontend ist statisch.** `apps/web` ist `output: 'static'`. Der Content
wird einmal beim Build über REST geholt; danach läuft für titz.cooking kein Code
mehr. Eine Änderung im Admin erscheint erst nach einem Rebuild. Den stösst
`apps/cms/src/hooks/rebuildWeb.ts` über den Deploy-Hook an — wer eine neue
Collection anlegt, muss sie dort einordnen, sonst bleibt sie stumm veraltet.
`tests/unit/rebuildWeb.test.ts` bricht, bis das passiert.

**2. Ein Push auf `main` führt keine Migrationen aus.** Workers Builds baut und
deployt, migriert aber nicht. Nach einer Schemaänderung gilt `pnpm deploy:cms`
statt `git push`. `pnpm migrate:status:prod` zeigt den Stand.

**3. Lokal gibt es keine Migrationen.** Der D1-Adapter schreibt im
Entwicklungsmodus das Schema direkt aus der Konfiguration; in
`payload_migrations` steht lokal nur ein Eintrag `dev`. Eine Migration läuft
darum das erste Mal überhaupt gegen Produktion. Migrationen entsprechend
aufmerksam lesen, bevor sie deployt werden.

**4. Niemals `pnpm seed` gegen Produktion.** Der Seed räumt Collections ab und
schreibt `content.json` hinein. In Produktion steht Redaktionelles, das dort
nicht drin ist — das Stage-Badge etwa auf «15 GaultMillau», `content.json` sagt
«16». Für Reparaturen an Produktion gibt es `apps/cms/scripts/repairProd.ts`:
Es fasst nur Dateien an, kein Inhaltsfeld, und schreibt erst mit
`REPAIR_APPLY=1`. Eine Umgebungsvariable, weil `payload run` Argumente hinter
dem Skriptnamen nicht durchreicht — ein `--apply` kam nie an und die Ausgabe
sah trotzdem nach Erfolg aus.

**5. Bilder brauchen die richtige Grösse _vor_ dem Upload.** Auf Workers gibt es
kein `sharp`, also keine Bildvarianten und kein nachträgliches Verkleinern. Was
hochgeladen wird, wird ausgeliefert.

**6. Der CMS-Build läuft mit `--webpack`.** Next 16 baut standardmässig mit
Turbopack, und OpenNext kann dessen Chunks nicht bündeln. Das Flag nicht
entfernen — sonst schlägt `build:cloudflare` mit
`Could not resolve "typescript-<hash>"` fehl.

**7. Das Frontend nutzt ausschliesslich REST.** GraphQL ist in
`payload.config.ts` abgeschaltet und die Routen sind gelöscht. Nichts wieder
einführen, ohne dass es einen Abnehmer gibt.

**8. Skripte im Wurzelverzeichnis rufen `pnpm … run <name>`, nicht
`pnpm … <name>`.** `deploy` ist ein pnpm-Builtin (`pnpm deploy <ziel>`) und
verdeckt ein gleichnamiges Skript — `pnpm --filter @titz/cms deploy` scheiterte
mit `ERR_PNPM_INVALID_DEPLOY_TARGET`, ohne das Skript je aufzurufen. Das
explizite `run` schliesst die Falle für alle Skriptnamen.

**9. MCP läuft nur lokal.** `@payloadcms/plugin-mcp` benutzt `mcp-handler`, das
für Vercel-Functions gebaut ist: Es hält die Antwort offen und wartet auf
Node-Stream-Ereignisse. Im Worker endet das im Deadlock — gemessen `HTTP 500`
und _«your Worker's code had hung»_ bei 67 ms Wall-Time, während dieselbe
Anfrage lokal `HTTP 200` liefert. Keinen `payload-prod`-Eintrag in `.mcp.json`
anlegen. Für Prod-Inhalt über MCP gibt es `pnpm dev:cms:remote`: lokaler
Node-Prozess, echte Bindings — und damit schreibt die Entwicklung in die
Produktionsdatenbank, also nur bewusst. Ohne MCP: REST-API oder `payload run`
mit `NODE_ENV=production`.

**10. Das Repo ist öffentlich.** Zugangsdaten gehören in
`wrangler secret put` oder in eine ignorierte `.env`. `.env.example` und
`.mcp.json` sind eingecheckt und enthalten nur Namen und `${PLATZHALTER}`. Der
pre-commit-Hook (`scripts/secret-scan.sh`) prüft das; er ist über
`core.hooksPath` verdrahtet, was das `prepare`-Skript beim `pnpm install` setzt.

## Typen sind die Absicherung

`packages/types` enthält das generierte Content-Modell. Beide Apps prüfen
dagegen, das Frontend baut daraus seine Block-Props
(`apps/web/src/lib/blocks.ts`). Ein umbenanntes CMS-Feld ist damit ein
Typfehler, kein leer gerenderter Abschnitt.

Nach **jeder** Änderung an Collections, Globals oder Feldern:

```bash
pnpm generate:types
```

Das Frontend prüft zusätzlich zur Laufzeit: `apps/web/src/lib/schemas.ts`
validiert jede CMS-Antwort mit Zod und bricht den Build ab, wenn ein Feld fehlt,
das eine Seite braucht. Neue Pflichtfelder dort ergänzen — der Typcheck erzwingt
es über `ModelleErfuellenSchemata`.

Handgeschriebene Interfaces für CMS-Daten sind nicht erlaubt. Sie hatten
durchgehend `string | undefined`, wo Payload `string | null | undefined` liefert —
die Abweichung fiel niemandem auf, weil nichts sie prüfte.

## Vor dem Commit

```bash
pnpm verify
```

Das ist dieselbe Kette wie in der CI: Secret-Scan, Prettier, ESLint, Typen,
beide Builds, Smoke-Tests.

Der Web-Build holt seinen Content standardmässig von admin.titz.cooking — ohne
`PAYLOAD_URL` entscheidet der Modus (`astro dev` lokal, `astro build`
Produktion). Wer ihn absichtlich gegen ein lokales CMS baut, braucht dort auch
Inhalt (`pnpm seed`); sonst entsteht eine leere Seite und die Smoke-Tests melden
fehlende Sektionen.

`PAYLOAD_URL` gehört **nicht** dauerhaft in `apps/web/.env`. Eine Zeile
`PAYLOAD_URL=http://localhost:3000` dort lässt jeden Build gegen das lokale CMS
laufen — ohne laufendes CMS bricht er mit «fetch failed» ab, und mit laufendem
CMS deployt `pnpm deploy:web` still lokalen Inhalt nach Produktion. Das
`deploy`-Skript setzt die Prod-Adresse darum selbst.

Die Smoke-Tests brauchen Port 4321 frei. Bleibt aus einem abgebrochenen Lauf ein
Preview-Server übrig, bricht `tests/globalSetup.ts` mit dem Aufräumbefehl ab —
früher liefen die Tests in diesem Fall still gegen den alten Build.

Nicht umgehen. Wer `--no-verify` braucht, hat einen Fund zu erklären.

## Testen

- **Unit** (`apps/cms/tests/unit/`, Vitest) nur für reine Logik ohne Datenbank.
- **Smoke** (`apps/web/tests/`, Playwright) gegen den fertigen Build: HTTP-Status
  und ob der Content im HTML angekommen ist.
- Keine Tests für Farben, Abstände oder Hover-Zustände. Keine visuellen
  Regressionstests. Keine Unit-Tests für Astro-Komponenten.
- Der eigentliche Integrationstest ist der Build: Er holt echten Content, Zod
  prüft ihn, jede Komponente muss rendern.

## Stil

Minimal. Keine Abstraktion vor dem dritten Anwendungsfall. Fehlerbehandlung an
echten Systemgrenzen — Nutzereingaben, fremde APIs —, nicht überall.

Prettier bestimmt die Form (`.prettierrc.json`, 100 Zeichen, keine Semikolons,
einfache Anführungszeichen). ESLint nur für echte Fehler; ungenutzte Variablen
sind Errors, Stilfragen macht Prettier.

## Deployen

```bash
pnpm deploy:cms   # Migrationen und Worker
pnpm deploy:web   # Frontend
```

Beide Worker hängen zusätzlich an Workers Builds und deployen bei einem Push auf
`main` — die CI in `.github/workflows/ci.yml` läuft davor und blockiert bei einem
Pull Request den Merge.
