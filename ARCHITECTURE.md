# Architektur

Warum dieses Projekt so gebaut ist. Was es _ist_, steht in
[README.md](README.md); die Regeln für die Arbeit daran in
[AGENTS.md](AGENTS.md).

## Der Aufbau in einem Satz

Payload liefert Inhalt über REST, Astro baut daraus eine statische Seite, und
ein Hook im CMS stösst den Rebuild an, sobald sich Inhalt ändert.

```
Redaktion ──speichert──▶ Payload (D1 + R2)
                            │
                    afterChange-Hook
                            │
                            ▼
                  Deploy-Hook, Workers Builds
                            │
                            ▼
              astro build ──holt REST──▶ Payload
                            │
                            ▼
              Workers Assets  ──▶  titz.cooking
```

## Entscheidungen

### Statisch, nicht serverseitig gerendert

`apps/web` ist `output: 'static'`. Drei Seiten mit Inhalt, der sich selten
ändert — jede Anfrage durch einen Worker zu schicken würde die Seite langsamer
und teurer machen, ohne etwas zu gewinnen.

Der Preis ist die Verzögerung beim Veröffentlichen. Bezahlt wird sie mit dem
Deploy-Hook (`apps/cms/src/hooks/rebuildWeb.ts`): Speichern im Admin →
POST auf den Hook → Build → rund eine Minute später ist die Änderung live. Das
Schwesterprojekt `alvier-payload` läuft bewusst anders, mit SSR und
`s-maxage`-Caching am Rand — dort gibt es Formulare, Abo-Verwaltung und
personalisierte Seiten, die statisch nicht gehen.

Ohne diesen Hook lief das Projekt monatelang auseinander: Am 31.08.2026 stand
auf titz.cooking «16 GaultMillau», im CMS längst «15». Der Build war einfach nie
wieder gelaufen.

### REST, nicht GraphQL

Das Frontend fragt `${PAYLOAD_URL}/api/…` ab (`apps/web/src/lib/payload.ts`).
GraphQL ist in `payload.config.ts` mit `graphQL: { disable: true }`
abgeschaltet und die beiden Routen sind gelöscht — Schema-Aufbau und
Playground lagen sonst ungenutzt im Worker-Bundle.

Der Nutzen, den ein GraphQL-Codegen brächte, kommt hier billiger: Payload
generiert die Typen ohnehin, und `packages/types` verteilt sie.

### Ein Paket für die Typen

`packages/types` enthält das generierte Content-Modell. Beide Apps prüfen
dagegen, und `apps/web/src/lib/blocks.ts` zieht daraus die Props jeder
Sektionskomponente.

Vorher deklarierte das Frontend seine Interfaces selbst. Sie wichen ab —
durchgehend `string | undefined`, wo Payload `string | null | undefined`
liefert — und niemand merkte es, weil nichts prüfte. Ein umbenanntes CMS-Feld
führte zu einer leer gerenderten Sektion bei grünem Build.

`packages/types/src/payload.ts` ist eine Kopie von
`apps/cms/src/payload-types.ts`, erzeugt von
`apps/cms/scripts/syncSharedTypes.mjs`. Kopiert statt direkt dorthin generiert,
weil Payload an die Originaldatei einen `declare module 'payload'`-Block hängt;
das Paket `payload` gibt es in `apps/web` nicht. Die Kopie ist eingecheckt,
damit ein Frontend-Build ohne laufendes CMS auskommt.

### Zod als Türsteher

TypeScript prüft, was das Modell verspricht. Über die API kommt irgendwann
etwas anderes — ein noch nie gespeichertes Global, eine halb gelaufene
Migration. `apps/web/src/lib/schemas.ts` prüft jede Antwort auf genau die
Felder, ohne die eine Seite kaputt wäre, und bricht den Build mit einer
Meldung ab, die Pfad und Grund nennt.

Bewusst nicht das ganze Modell: 1500 Zeilen handgepflegtes Schema würden für
sich driften. Die Bindung ans generierte Modell macht der Typ
`ModelleErfuellenSchemata` — verlangt ein Schema ein Feld, das es im CMS nicht
mehr gibt, bricht der Typcheck.

### E-Mail über das Binding, nicht über SMTP

Payload hatte bis zum 02.09.2026 gar keinen E-Mail-Adapter. Das ist kein
stiller Ausfall mit Fehlermeldung: Payload nimmt «Passwort vergessen» an, zeigt
im Admin eine Bestätigung und schreibt eine Warnung ins Log. Der Link zum
Zurücksetzen entstand nie.

Cloudflare bietet seit Juni 2026 einen SMTP-Endpunkt an, und Payload hat einen
Nodemailer-Adapter — zusammen liegt der Weg nahe. Er funktioniert von diesem
Worker aus trotzdem nicht. `smtp.mx.cloudflare.net` löst auf 162.159.205.26 bis
.28 auf, und die Workers-Runtime sagt: «outbound TCP sockets to Cloudflare IP
ranges are blocked». Nodemailer braucht genau so einen Socket. Der Worker darf
gerade zu Cloudflares eigenem Mailserver nicht verbinden.

Also das `send_email`-Binding. Zweiter Grund, der auch ohne die Sperre gälte:
Das SMTP-Passwort wäre ein Cloudflare-API-Token mit «Email Sending: Edit» — mit
dem sich von **jeder** Domain des Kontos Mail verschicken lässt. Das Binding ist
an diesen Worker gebunden und endet mit ihm; es braucht kein Geheimnis.

Der SMTP-Endpunkt bleibt richtig für alles ausserhalb von Workers — ein Skript
auf dem Notebook, ein Docker-Dienst, ein Cron auf einem Server.

Das Binding steht bewusst **ohne** `remote: true`. Sonst verschickte jedes
`next dev` echte Nachrichten an echte Adressen. Lokal fehlt es damit, und
`src/email/cloudflareEmail.ts` protokolliert die Nachricht statt sie zu senden —
beim Zurücksetzen eines Passworts steht der Link dann im Terminal.

## Caching

Vier Ebenen, jede mit einem anderen Grund.

| Wo                                     | Was                              | Warum                                                                                                                            |
| -------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/public/_headers`             | `/_astro/*` ein Jahr `immutable` | Inhaltshash im Dateinamen; Workers Assets setzt sonst überall `max-age=0, must-revalidate`                                       |
| dieselbe Datei, HTML                   | Standard belassen                | Nach einem Rebuild darf niemand den alten Stand sehen, und es gibt kein Purge-Token                                              |
| `apps/cms/src/uploads/cacheHeaders.ts` | Bilder und Icon-SVGs `immutable` | Der R2-Handler setzt von sich aus keine `Cache-Control`; jedes Bild kostete sonst eine Worker-Invocation samt D1- und R2-Zugriff |
| `apps/web/src/lib/payload.ts`          | Antworten während des Builds     | Jede Seite fragte sonst Header, Footer, Settings und Icon-Liste erneut ab                                                        |

`immutable` auf Uploads ist vertretbar, weil Payload einen belegten Dateinamen
hochzählt statt zu überschreiben. Wer einen Datensatz löscht und danach eine
andere Datei unter demselben Namen hochlädt, muss den Namen ändern.

### Was der Cache-Schalter der Worker bedeutet

Bei beiden Workern steht «Cache» im Dashboard auf _Disabled_, und beides ist
richtig — aus verschiedenen Gründen.

**Web-Worker.** Der Schalter betrifft Antworten, die Worker-_Code_ erzeugt, und
es gibt keinen Code. Die statischen Assets cachen am Rand unabhängig davon;
gemessen liefert titz.cooking `cf-cache-status: HIT`.

**Admin-Worker.** Hier ist _Disabled_ eine Sicherheitsentscheidung: Das Admin
ist über Cookies authentisiert, und eine zwischengespeicherte angemeldete
Antwort könnte an Fremde gehen.

Daraus folgt eine Einschränkung, die man kennen muss: Für Workers gilt keine
Zonen-Cache-Konfiguration — ohne diesen Schalter speichert Cloudflare
Worker-Antworten überhaupt nicht zwischen. Die `immutable`-Kopfzeile auf
Bildern wirkt darum **im Browser**, nicht am Rand. Ein wiederkehrender Besucher
holt kein Bild mehr; der erste Aufruf jedes neuen Besuchers geht weiterhin durch
Worker, D1 und R2.

Ein Rand-Cache für Bilder wäre über eine eigene R2-Custom-Domain zu haben —
Dateien direkt aus dem Bucket, kein Worker im Pfad. Das ist verworfen, weil es
die Zugriffsprüfung unten umgehen würde; die Begründung steht bei den
verworfenen Wegen.

## Daten und Dateien

**D1 `titz-payload-site`** hält den Inhalt, **R2 `titz-payload-media`** die
Dateien. Beides über Bindings, nicht über Zugangsdaten — `getPlatformProxy` in
der Entwicklung, der echte Kontext im Worker
(`apps/cms/src/payload.config.ts`).

Auf Workers gibt es kein `sharp`. Also keine Bildvarianten, kein Zuschneiden,
kein Fokuspunkt (`crop: false`, `focalPoint: false`). Bilder müssen in der
richtigen Grösse hochgeladen werden.

### Wer welche Bilder sehen darf

`media` stand auf `read: () => true`. Am 01.09.2026 war damit messbar:

```
GET /api/media?where[kategorie][equals]=privat  → 200, totalDocs: 23
GET /api/media/file/privat-nacht-01.jpg         → 200
```

Ohne Anmeldung, und nicht nur abrufbar sondern **auflistbar** — man holt sich die
Namen aller privaten Aufnahmen und lädt sie einzeln herunter. Die Bibliothek
enthält 36 Bilder mit `verwendung: intern`, eines mit `archiv` und 23 in der
Kategorie `privat`: Familien- und Reiseaufnahmen. Das Feld `verwendung` war von
Anfang an dafür gedacht, Bildmaterial für die Seite von privaten Aufnahmen zu
trennen — nur hat es niemand ausgewertet.

`collections/mediaZugriff.ts` wertet es jetzt aus. Payload nimmt aus einer
Access-Funktion auch ein `where`-Objekt an und hängt es als Bedingung an die
Abfrage; `checkFileAccess` tut dasselbe für die Datei-Route. Eine Regel deckt
also Liste und Datei ab:

|                                     | vorher | nachher |
| ----------------------------------- | ------ | ------- |
| `?where[kategorie][equals]=privat`  | 23     | 0       |
| `?where[verwendung][equals]=intern` | 36     | 0       |
| alle Bilder                         | 162    | 125     |
| `privat-nacht-01.jpg`               | 200    | 403     |
| `portrait-titz.webp`                | 200    | 200     |

Ausgeschlossen wird, was ausdrücklich nicht öffentlich ist (`not_in`), nicht
umgekehrt nur `web` zugelassen: Ein Datensatz ohne gesetztes Feld würde sonst
stillschweigend aus der Seite verschwinden.

### Schema: lokal geschoben, in Produktion migriert

Zwei verschiedene Verfahren, und das ist die unangenehmste Eigenschaft des
Aufbaus:

- **Lokal** schreibt der D1-Adapter das Schema im Entwicklungsmodus direkt aus
  der Konfiguration. In `payload_migrations` steht ein einzelner Eintrag `dev`.
  Bequem — man legt ein Feld an und es ist da.
- **In Produktion** laufen Migrationen aus `apps/cms/src/migrations/`.

Daraus folgt: **eine Migration läuft das erste Mal überhaupt gegen Produktion.**
Lokal wird sie nie ausgeführt. `pnpm migrate:status:prod` zeigt vorher, was
aussteht; die generierte SQL vorher lesen ist keine Formsache.

Zweite Falle: **Workers Builds migriert nicht.** Der Push auf `main` baut und
deployt, führt aber keine Migration aus. Nach einer Schemaänderung gilt
`pnpm deploy:cms`, das beides tut.

### Der Seed ist für leere Datenbanken

`pnpm seed` räumt Collections ab und schreibt `content.json` hinein. Gegen
Produktion ist er darum verboten — dort steht Redaktionelles, das in
`content.json` nicht existiert.

Historie, weil sie sich wiederholen kann: Der Seed holte seine Bilder von
`https://titz.cooking/_astro/image.*.webp`, also von der Seite, die er gerade
ersetzte. Nach dem ersten Deploy gab es diese Adressen nicht mehr; der
Prod-Seed am 06.07.2026 schrieb 11 Byte `text/plain` in jedes Bild. Dazu landeten
die Dateien im lokalen Miniflare-R2 statt im echten Bucket, weil nur die
Datenbank remote verbunden war. Ergebnis: Alle Bilder auf titz.cooking
antworteten mit 404. Seither liegen die Quellen im Repo
(`apps/cms/src/seed/assets/`), und für Reparaturen an Produktion gibt es
`apps/cms/scripts/repairProd.ts` — nur Dateien, kein Inhaltsfeld, Schreiben
erst mit `--apply`.

## MCP

Das CMS stellt seinen Inhalt unter `/api/mcp` bereit
(`@payloadcms/plugin-mcp`), authentisiert über die Collection
`payload-mcp-api-keys`. Freigegeben ist alles Redaktionelle;
`users` bewusst nicht, sonst liessen sich über die Tools Konten anlegen und
Passwörter setzen.

## Qualitätssicherung

`pnpm verify` und `.github/workflows/ci.yml` laufen dieselbe Kette:

1. **Zugangsdaten** — `scripts/secret-scan.sh`. Das Repo ist öffentlich.
   GitHubs Push Protection ist aktiv, kennt aber nur Muster bekannter Anbieter;
   ein `PAYLOAD_SECRET` ist bloss 64 Zeichen Hex.
2. **Prettier und ESLint** — Form und echte Fehler, keine Stildiskussionen.
3. **Typen** — `tsc --noEmit` und `astro check` gegen `packages/types`.
4. **Builds** — der eigentliche Integrationstest. Astro holt echten Content,
   Zod prüft ihn, jede Komponente muss rendern.
5. **Smoke-Tests** — Playwright gegen `dist/`: Status und ob der Inhalt im HTML
   angekommen ist.

Nicht dabei, mit Absicht: visuelle Regressionstests und Unit-Tests für
Komponenten. Beide brechen bei jeder Designänderung und sagen nichts über die
Funktion.

## Verworfene Wege

- **Bilder über eine R2-Custom-Domain** (etwa `media.titz.cooking`). Hätte den
  Worker aus dem Bildpfad genommen und echtes Rand-Caching gebracht. Verworfen,
  weil sie die Zugriffsprüfung aus «Wer welche Bilder sehen darf» **umgehen**
  würde: Sie liefert direkt aus dem Bucket, ohne Payload. Damit wäre sie nicht
  bloss unnötig, sondern schädlich.

  Der Cache-Gewinn wäre ausserdem klein — `immutable` greift schon im Browser,
  ein wiederkehrender Besucher holt kein Bild mehr. Nur der erste Aufruf jedes
  neuen Besuchers geht durch Worker, D1 und R2, bei vier Bildern auf der
  Startseite.

  Wird Rand-Caching später doch gebraucht, wäre der Weg ein Proxy auf dem
  Web-Worker (`run_worker_first` für `/media/*`): Bucket bleibt privat, die
  Prüfung bleibt möglich, und dort darf `cache.enabled` an, weil keine Cookies
  im Spiel sind.

- **`defaultValue` als Funktion für das Sortierfeld.** In den drei
  Karten-Sammlungen stand `order` auf `defaultValue: 0`; jeder neue Eintrag
  bekam damit dieselbe Zahl wie ein vorhandener und landete an
  unvorhersehbarer Stelle. Naheliegend wäre, die 0 durch eine Funktion zu
  ersetzen, die `max(order) + 1` liest.

  Verworfen, weil der D1-Adapter ein **literales** `defaultValue` in einen
  Spalten-Default übersetzt. Ohne die 0 verschwindet das `DEFAULT 0` aus dem
  Schema, und weil SQLite den Default einer Spalte nicht ändern kann, erzeugt
  Drizzle dafür einen vollständigen Tabellenneubau: `CREATE TABLE __new_…`,
  `INSERT … SELECT`, `DROP`, `RENAME`, mit `PRAGMA foreign_keys=OFF`. Gemessen
  am 02.09.2026 mit `payload migrate:create` — für alle drei Sammlungen auf
  einmal. Diese Migration liefe nach «Schema: lokal geschoben, in Produktion
  migriert» das erste Mal überhaupt gegen Produktion.

  Ein Tabellenneubau auf drei Inhaltstabellen für eine Sortier-Annehmlichkeit
  ist ein schlechter Tausch. Die 0 bleibt darum stehen, und ein Feld-Hook in
  `src/fields/reihenfolge.ts` setzt den Wert in der Anwendungsschicht.
  `migrate:create` meldet danach «No schema changes detected».

- **TypeScript 7.** Gemessen am 01.09.2026: `tsc --noEmit` aus TS 7 bricht am
  CMS mit `error TS5102: Option 'baseUrl' has been removed` ab, `@astrojs/check`
  nennt als Peer `^5.0.0 || ^6.0.0` und `typescript-eslint` `>=4.8.4 <6.1.0`.
  Beide Typ-Tore des Frontends tragen TS 7 also nicht. Dazu die Feststellung aus
  `alvier-payload`: `astro check` treibt TypeScript über die programmatische API,
  die der Go-Port nicht anbietet — das Frontend verlöre seine Typprüfung. Bleibt
  bei 5.9.

## Offene Punkte

- **Cloudflare Access vor `/admin`.** Das Admin-Panel ist öffentlich erreichbar,
  davor steht nur E-Mail und Passwort. Bewusst aufgeschoben.

  Wenn es kommt, ist es ein Port und kein Neubau: Im Schwesterprojekt
  `alvier-payload` liegt der fertige Code unter `apps/cms/src/auth/` samt
  Unit-Test — in diesem Repo gibt es das Verzeichnis nicht. Zwei Fallen sind dort
  dokumentiert — die Strategie muss **beides** lesen, den Header
  `Cf-Access-Jwt-Assertion` und den Cookie `CF_Authorization`, weil Access den
  Header nur auf den Pfaden seiner Application setzt und die Admin-UI ihre
  Identität über `/api/users/me` prüft, das aussenherum liegt; und fehlende
  `CF_ACCESS_TEAM_DOMAIN`/`CF_ACCESS_AUD` gaben still `null` zurück.

  Wichtig für die Einrichtung: Die Application darf **nur** `/admin` abdecken,
  nicht `/api/*` — sonst kommt der Astro-Build nicht mehr an den Content. Die
  Content-API bleibt damit offen, und genau deshalb war die Zugriffsprüfung auf
  `media` die Voraussetzung und nicht die Alternative.

- **`users` hat kein Rollenfeld.** Jeder angemeldete Benutzer darf alles. Wird
  fällig, wenn jemand aus dem Restaurant Inhalte pflegt und nicht an `users`
  soll — dann in einem Zug mit `users.access`.

- **Astro Content Layer.** Ein eigener Loader würde Abfragen, Zwischenspeicher
  und Validierung an einer Stelle bündeln und `getCollection()` typsicher
  bereitstellen. Ersetzt `lib/payload.ts` samt `lib/schemas.ts` und alle
  Aufrufstellen — für beides gibt es hier schon eine Entsprechung.

  Der Auslöser, ab dem es sich lohnt: wenn eine Collection so gross wird, dass
  ein Build sie nicht mehr in einem Rutsch holen soll, oder wenn Bilder durch
  Astros Asset-Pipeline sollen.
