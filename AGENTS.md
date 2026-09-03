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

## Zwölf Dinge, die überraschen

**1. Das Frontend ist statisch.** `apps/web` ist `output: 'static'`. Der Content
wird einmal beim Build über REST geholt; danach läuft für titz.cooking kein Code
mehr. Eine Änderung im Admin erscheint erst nach einem Rebuild. Den stösst
`apps/cms/src/hooks/rebuildWeb.ts` über den Deploy-Hook an — wer eine neue
Collection anlegt, muss sie dort einordnen, sonst bleibt sie stumm veraltet.
`apps/cms/tests/unit/rebuildWeb.test.ts` bricht, bis das passiert; beim
Hinzufügen von `events` hat er genau das getan.

Ein Nebeneffekt davon betrifft die Anlässe: Der Filter «was noch kommt» in
`apps/web/src/components/sections/Events.astro` läuft zur Bauzeit. Ein
abgelaufener Einzeltermin verschwindet erst beim nächsten Build. Wöchentliche
Anlässe haben kein Ablaufdatum und bleiben stehen.

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

In der Mediathek liegen rund 130 Aufnahmen mit 2560 px und 0,4 bis 2,2 MB — als
Archiv richtig, im Browser nicht. Am 02.09.2026 stand ein PNG von 1,14 MB in
einer Kachel von 350 × 200 Pixel. Wer ein Bild einsetzt, verkleinert es vorher
auf die doppelte Darstellungsbreite (`cwebp -q 82 -resize <breite> 0`);
`apps/cms/scripts/bildErsetzen.ts` tauscht die Datei an einem bestehenden
Datensatz, ohne Verweise zu brechen. Dauerhaft löst das Cloudflares
Bildtransformation — siehe
[ARCHITECTURE.md](ARCHITECTURE.md#bildtransformation-am-rand-hinter-einem-schalter).

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

**10. E-Mail läuft über das Binding, nicht über SMTP.** Cloudflare bietet
`smtp.mx.cloudflare.net:465` an, und Payload hat einen Nodemailer-Adapter —
zusammen funktioniert das hier trotzdem nicht. Der Host löst auf 162.159.205.26
bis .28 auf, und für Workers gilt «outbound TCP sockets to Cloudflare IP ranges
are blocked»: Der Worker darf gerade dorthin nicht. Der Adapter in
`src/email/cloudflareEmail.ts` nimmt darum das `send_email`-Binding, das ohne
Zugangsdaten auskommt. Der SMTP-Endpunkt bleibt richtig für alles ausserhalb von
Workers. Das Binding steht bewusst **ohne** `remote: true` in `wrangler.jsonc`,
damit kein `next dev` echte Mail verschickt — lokal landet die Nachricht im Log.

**11. Ein `process.exit()` am Ende eines Skripts verhindert den Rebuild.**
`hooks/rebuildWeb.ts` setzt seinen Fetch an den Deploy-Hook im Hintergrund ab
(`void (async () => …)()`). Wer danach sofort beendet, bricht ihn ab: Produktion
ist geschrieben, titz.cooking zeigt weiter den alten Stand — und nichts meldet
einen Fehler. Genau so lief `importNews.ts` beim ersten Mal. Skripte laufen
darum ohne `process.exit` aus.

Dazu: In `apps/cms/.env` ist `WEB_DEPLOY_HOOK_URL` **leer**. Der Hook meldet
lokal also «nicht-konfiguriert» und tut nichts, auch ohne `process.exit`. Auf
dem Worker liegt das Secret (`wrangler secret list --name titz-payload-admin`),
im Admin gespeicherte Änderungen lösen den Build also aus. Nach einem
Skriptlauf gegen Produktion muss man ihn selbst anstossen: `pnpm run deploy:web`.

**12. Das Repo ist öffentlich.** Zugangsdaten gehören in
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

## TypeScript bleibt bei 5.9

Nicht auf 7 gehen. `tsc --noEmit` aus TS 7 bricht am CMS mit
`Option 'baseUrl' has been removed` ab, `@astrojs/check` und `typescript-eslint`
nennen TS 7 nicht in ihren Peers, und `astro check` treibt TypeScript über die
programmatische API, die der Go-Port nicht anbietet — das Frontend verlöre seine
Typprüfung. Begründung mit Messwerten in
[ARCHITECTURE.md](ARCHITECTURE.md#verworfene-wege).

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
Preview-Server übrig, bricht `apps/web/tests/globalSetup.ts` mit dem Aufräumbefehl ab —
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

### `IMAGE_TRANSFORM` gehört in jeden Produktivbuild

`pnpm deploy:web` setzt die Variable seit dem 03.09.2026 selbst. Vorher tat es
nur Workers Builds — ein lokales `pnpm deploy:web` baute damit **ohne**
Bildtransformation und nahm sie in Produktion still zurück: kein Fehler, keine
Warnung, nur wieder Originalbilder mit bis zu 2,2 MB. Die Variable nicht aus
dem Skript entfernen.

Prüfen lässt sich das am gebauten HTML:

```bash
grep -c cdn-cgi apps/web/dist/index.html   # muss > 0 sein
```

### Textfarben nur aus dem Token

Für gedämpften Text gibt es genau `var(--ink-muted)`. Kein
`rgba(47, 53, 56, 0.6)` daneben, auch nicht «nur an dieser einen Stelle».

Vorher standen drei Token-Stufen und in sechs Komponenten handgeschriebene
Alphawerte zwischen 0.5 und 0.65; auf Weiss ergab das 2.5:1 bis 4.2:1 und damit
durchweg weniger als die 4.5:1, die WCAG AA für Text unter 18.66 px verlangt.
Der Token heisst darum nicht mehr `--ink-70` — die Zahl im Namen war die
Einladung, für «etwas leiser» eine eigene zu schreiben.

Dasselbe gilt für `--gold`: Die Farbe trägt ausschliesslich Text und ist auf den
dunkelsten Untergrund gerechnet, auf dem sie steht — `--mint` in den Anlässen,
nicht Weiss. Wer sie aufhellt, bricht die Anlässe, nicht die Startseite.

Gegenprüfen lässt sich das mit Lighthouse gegen `pnpm --filter @titz/web preview`;
der Wert für Barrierefreiheit steht am 03.09.2026 auf 100.

## Deployen

```bash
pnpm deploy:cms   # Migrationen und Worker
pnpm deploy:web   # Frontend
```

Beide Worker hängen zusätzlich an Workers Builds und deployen bei einem Push auf
`main` — die CI in `.github/workflows/ci.yml` läuft davor und blockiert bei einem
Pull Request den Merge.
