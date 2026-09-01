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

Der saubere Weg zu einem Rand-Cache für Bilder wäre eine eigene R2-Custom-Domain
(etwa `media.titz.cooking`): Dateien direkt aus dem Bucket, kein Worker im Pfad,
Caching am Rand von selbst. Dafür müsste Payload diese Adressen ausgeben —
`@payloadcms/storage-r2` bietet dafür keine Option, es bräuchte ein eigenes
`generateFileURL`. Siehe offene Punkte.

## Daten und Dateien

**D1 `titz-payload-site`** hält den Inhalt, **R2 `titz-payload-media`** die
Dateien. Beides über Bindings, nicht über Zugangsdaten — `getPlatformProxy` in
der Entwicklung, der echte Kontext im Worker
(`apps/cms/src/payload.config.ts`).

Auf Workers gibt es kein `sharp`. Also keine Bildvarianten, kein Zuschneiden,
kein Fokuspunkt (`crop: false`, `focalPoint: false`). Bilder müssen in der
richtigen Grösse hochgeladen werden.

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

## Offene Punkte

- **Cloudflare Access vor `/admin`.** Das Admin-Panel ist öffentlich
  erreichbar, davor steht nur E-Mail und Passwort. `alvier-payload` hat Access;
  hier ist es bewusst aufgeschoben.
- **`users` hat kein Rollenfeld.** Jeder angemeldete Benutzer darf alles.
  Solange es einen Benutzer gibt, ist das kein Problem.
- **Bilder über eine R2-Custom-Domain** (etwa `media.titz.cooking`). Würde den
  Worker aus dem Bildpfad nehmen und echtes Rand-Caching bringen (siehe oben).
  Nichts davon existiert bisher — es bräuchte zwei Dinge: eine Custom Domain am
  Bucket im Dashboard und ein eigenes `generateFileURL` in der
  Upload-Konfiguration, weil `@payloadcms/storage-r2` dafür keine Option
  bietet.

  Vorher zu klären: **Eine R2-Custom-Domain macht das ganze Bucket öffentlich
  lesbar.** In der Bibliothek liegen 36 Bilder mit `verwendung: intern`, eines
  mit `archiv` und 23 in der Kategorie `privat` — Familien- und Reiseaufnahmen.
  Heute schützt sie nichts als die Unauffälligkeit ihrer Adresse, aber eine
  öffentliche Domain macht sie ohne Umweg abrufbar. Der Ausweg wäre, nur
  `verwendung: web` in ein zweites, öffentliches Bucket zu spiegeln — deutlich
  mehr Arbeit als der Cache-Gewinn wert ist, solange die Bilder nach dem ersten
  Aufruf im Browser liegen.

- **Smart Placement für den Admin-Worker.** D1 antwortet aus EEUR (Mailand); das
  Admin macht viele aufeinanderfolgende Abfragen pro Seitenaufruf. Placement
  steht auf `Default`. Ein Versuch mit `smart` kostet nichts und ist
  reversibel.
- **Astro Content Layer.** Ein eigener Loader würde Abfragen, Zwischenspeicher
  und Validierung an einer Stelle bündeln und `getCollection()` typsicher
  bereitstellen. Ersetzt `lib/payload.ts` samt `lib/schemas.ts` — grösserer
  Umbau, lohnt sich erst, wenn mehr Collections dazukommen.
