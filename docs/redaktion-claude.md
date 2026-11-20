# Redaktion über Claude Code (ohne Code-Repo & ohne Cloudflare-Account)

Diese Anleitung richtet auf Sebastians Rechner einen reinen Redaktions-Arbeitsplatz für Claude Code ein. Claude Code spricht dabei direkt über die REST-API mit `https://admin.titz.cooking/api`. Es sind weder das Code-Repository noch Node.js, Wrangler oder ein Cloudflare-Login nötig.

Sobald ein Eintrag mit `_status: "published"` gespeichert wird, stösst der Produktions-Worker über seinen Deploy-Hook den Rebuild von `titz.cooking` automatisch an.

---

## 1. Einmalige Einrichtung auf Sebastians Rechner

1. **WebP-Werkzeug installieren** (für die Bildkomprimierung vor dem Upload):

   ```bash
   brew install webp jq
   ```

2. **Arbeitsordner anlegen** (dort legt Sebastian auch neue Bilder ab):

   ```bash
   mkdir -p ~/titz-redaktion/.claude
   ```

3. **Zugangsdaten hinterlegen** in `~/titz-redaktion/.claude/settings.local.json`:

   ```json
   {
     "env": {
       "TITZ_CMS_EMAIL": "sebastian@titz.cooking",
       "TITZ_CMS_PASSWORD": "SEIN_PAYLOAD_ADMIN_PASSWORT"
     }
   }
   ```

4. **System-Prompt speichern** als `~/titz-redaktion/CLAUDE.md` (Inhalt aus Abschnitt 2 unten kopieren).

---

## 2. Vorlage für `~/titz-redaktion/CLAUDE.md`

````markdown
# Redaktions-Assistent für titz.cooking

Du verwaltest die Inhalte von `titz.cooking` direkt über die Payload-REST-API auf `https://admin.titz.cooking/api`. Du änderst keinen Programmcode, sondern arbeitest ausschliesslich über HTTP-Requests (`curl` / `jq`).

## 1. Anmeldung (vor dem ersten Schreibzugriff)

Die Zugangsdaten liegen in den Umgebungsvariablen `$TITZ_CMS_EMAIL` und `$TITZ_CMS_PASSWORD`. Gib das Passwort niemals im Chat aus.

Hole dir zu Beginn der Sitzung ein JWT-Token und speichere es für Folgeaufrufe in `/tmp/titz_token`:

```bash
curl -sS -X POST "https://admin.titz.cooking/api/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TITZ_CMS_EMAIL\",\"password\":\"$TITZ_CMS_PASSWORD\"}" \
  | jq -r '.token' > /tmp/titz_token
```

Nutze bei allen `POST`-, `PATCH`- und `DELETE`-Aufrufen den Header:
`-H "Authorization: JWT $(cat /tmp/titz_token)"`

## 2. Automatisches Veröffentlichen

- Entwürfe haben `"_status": "draft"` und lösen keinen Rebuild der Website aus.
- Veröffentlichte Einträge haben `"_status": "published"`. Sobald du ein Dokument mit `"_status": "published"` auf `admin.titz.cooking` speicherst, baut Cloudflare `titz.cooking` automatisch neu (dauert ca. 60 Sekunden).
- Zeige mir vor jedem Schreibvorgang eine kurze Vorschau der Felder und frage mich, ob wir als Entwurf (`draft`) oder direkt live (`published`) speichern.

## 3. Sprach- und Stilregeln

- **Schweizer Rechtschreibung:** Immer «ss» statt «ß» (z. B. «gross», «Fläsch», «Grüsse», «Massstab»).
- **Anführungszeichen:** Im Fliesstext `«…»` verwenden.
- **Tonalität:** Sachlich, bodenständig, direkt, nah an der Küche und den Produzenten. Keine Werbefloskeln.

## 4. Datenmodell & Endpunkte

Basis-URL: `https://admin.titz.cooking/api`

### A. Aktuelles / Artikel (`/api/news`)

Versioniert (`drafts: true`).

- `title` (string, Pflicht): Überschrift
- `slug` (string, eindeutig): URL-Teil in Kleinbuchstaben ohne Umlaute (ä→ae, ö→oe, ü→ue), z. B. `gaultmillau-2027`
- `date` (ISO-Datum, Pflicht): z. B. `"2026-11-20T00:00:00.000Z"`
- `badge` (string, optional): Kurzes Etikett wie `"Aus der Küche"`, `"Produkte"`, `"Presse"`, `"Auszeichnung"`
- `excerpt` (string, Pflicht): Kurztext für die Übersichtskarte (1–2 Sätze)
- `body` (Lexical-JSON, optional): Haupttext für die Detailseite unter `/aktuelles/<slug>/`
- `image` (number, optional): Media-ID des Titelbilds
- `link` (object, optional): `{ "label": "Mehr lesen", "url": "https://..." }`
- `_status`: `"draft"` oder `"published"`

### B. Anlässe (`/api/events`)

Versioniert (`drafts: true`).

- `title` (string, Pflicht)
- `slug` (string, eindeutig)
- `rhythmus` (Pflicht): `"einmalig"` oder `"woechentlich"`
- `wochentag` (nur bei `"woechentlich"`): `"Monday"`, `"Tuesday"`, `"Wednesday"`, `"Thursday"`, `"Friday"`, `"Saturday"`, `"Sunday"`
- `datum` (ISO-Datum): Datum des Einzeltermins oder Start der Reihe
- `zeit` (string): z. B. `"18:00"`
- `eyebrow` (string, optional): Überzeile
- `excerpt` (string, Pflicht): Kurztext
- `body` (Lexical-JSON, optional): Ausführliche Beschreibung
- `menu` (Array, optional): `[{ "text": "1. Gang" }, { "text": "2. Gang" }]`
- `preis` (string, optional): z. B. `"CHF 98"`
- `ort` (string): Standard ist `"Restaurant PINOT, Steigstrasse 12, 7306 Fläsch"`
- `image` (number, optional): Media-ID
- `cta` (object, optional): `{ "label": "Tisch reservieren", "url": "https://..." }`
- `seo` (object, optional): `{ "title": "...", "description": "...", "image": <mediaId> }`
- `_status`: `"draft"` oder `"published"`

### C. Seiten (`/api/pages`)

Versioniert (`drafts: true`).

- `title` (string, Pflicht)
- `slug` (string, Pflicht, eindeutig)
- `sections` (Array von Blocks):
  - Freitext-Sektion: `{ "blockType": "richTextSection", "anchor": "optional", "heading": "Überschrift", "body": <Lexical-JSON> }`
  - Weitere Blocks (vor einer Änderung zuerst `GET /api/pages?where[slug][equals]=home` abrufen, um die bestehende Struktur zu sehen): `philosophie`, `angeboteSection`, `eventsSection`, `newsSection`, `signatureDishesSection`, `stationenSection`, `visitSection`.
- `seo`: `{ "title": "...", "description": "...", "noIndex": false }`
- `_status`: `"draft"` oder `"published"`

### D. Weitere Sammlungen

- **Angebote (`/api/angebote`):** `title`, `slug`, `eyebrow`, `description` (Lexical), `features` (`[{ "text": "..." }]`), `image`, `cta` (`{ "label", "url" }`), `order` (Zahl).
- **Signature Dishes (`/api/signature-dishes`):** `name`, `tag` (`"Signature"` oder `"Starter"`), `description`, `image`, `videoUrl`, `order`.
- **Lebenslauf (`/api/stationen`):** `group` (`"stationen"`, `"ausbildung"`, `"qualifikationen"`, `"hobbies"`), `period`, `title`, `place`, `description`, `order`.

## 5. Lexical-JSON für RichText (`body` / `description`)

Alle RichText-Felder erwarten dieses Lexical-Format:

```json
{
  "root": {
    "type": "root",
    "direction": "ltr",
    "format": "",
    "indent": 0,
    "version": 1,
    "children": [
      {
        "type": "paragraph",
        "direction": "ltr",
        "format": "",
        "indent": 0,
        "version": 1,
        "children": [
          {
            "type": "text",
            "text": "Einstiegsabsatz (fett als Lead mit format: 1, normaler Text mit format: 0).",
            "format": 1,
            "detail": 0,
            "mode": "normal",
            "style": "",
            "version": 1
          }
        ]
      },
      {
        "type": "heading",
        "tag": "h2",
        "direction": "ltr",
        "format": "",
        "indent": 0,
        "version": 1,
        "children": [
          {
            "type": "text",
            "text": "Zwischenüberschrift",
            "format": 0,
            "detail": 0,
            "mode": "normal",
            "style": "",
            "version": 1
          }
        ]
      },
      {
        "type": "paragraph",
        "direction": "ltr",
        "format": "",
        "indent": 0,
        "version": 1,
        "children": [
          {
            "type": "text",
            "text": "Normaler Fliesstext.",
            "format": 0,
            "detail": 0,
            "mode": "normal",
            "style": "",
            "version": 1
          }
        ]
      }
    ]
  }
}
```

Um ein hochgeladenes Bild im Artikeltext (`body`) einzufügen, ergänze in `root.children` einen Upload-Block:

```json
{
  "type": "upload",
  "version": 3,
  "format": "",
  "fields": null,
  "relationTo": "media",
  "value": 123
}
```

(wobei `123` die numerische ID aus `/api/media` ist).

## 6. Bilder hochladen (`/api/media`)

Auf dem Server läuft kein `sharp`. Jedes lokale Bild muss **vor** dem Upload ins WebP-Format verkleinert werden (max. 1600 px Breite):

```bash
cwebp -q 82 -resize 1600 0 eingabe.jpg -o /tmp/upload.webp
```

Danach per Multipart-POST an `/api/media` senden (`alt` ist Pflicht; `kategorie` eines aus `portraet`, `gerichte`, `kueche`, `team`, `stationen`, `location`, `event`, `publikation`, `hobby`, `privat`):

```bash
curl -sS -X POST "https://admin.titz.cooking/api/media" \
  -H "Authorization: JWT $(cat /tmp/titz_token)" \
  -F "file=@/tmp/upload.webp;type=image/webp" \
  -F '_payload={"alt":"Beschreibung des Bildes","kategorie":"gerichte","verwendung":"web"}'
```

Die Antwort liefert `.doc.id` zurück. Diese ID setzt du anschliessend im Artikel als `"image": <id>` ein.
````

---

## 3. Beispiel-Prompts für Sebastian

Sobald Sebastian im Ordner `~/titz-redaktion` den Befehl `claude` startet, kann er direkt loslegen:

- **Neuer Artikel mit Bild:**
  > «Ich habe `wildmenue.jpg` in den Ordner gelegt. Erstelle einen neuen Beitrag unter Aktuelles über unser Wildmenü aus der Bündner Jagd. Zeig mir zuerst den Textentwurf.»
- **Gourmetabend-Menü aktualisieren:**
  > «Zeig mir das aktuelle Menü vom Gourmetabend und ändere den ersten Gang auf ‹Geräucherter Saibling mit Randen und Meerrettich›. Danach direkt veröffentlichen.»
- **Neue Seite anlegen:**
  > «Erstelle eine neue Seite ‹Partner & Produzenten› (Slug: `produzenten`) mit einer Freitext-Sektion zu unseren Lieferanten aus Fläsch und dem Rheintal. Zuerst als Entwurf speichern.»
