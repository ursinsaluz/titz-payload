# Designsprache «Verspielt»

Beschreibt, was auf titz.cooking tatsächlich umgesetzt ist. Quelle der Wahrheit
sind `apps/web/src/styles/global.css` (Tokens, Animationen) und die Komponenten
darunter — dieses Dokument erklärt die Absicht dahinter.

> Ein älteres `DESIGN.md` im Repo `titz-web` beschreibt eine ganz andere
> Richtung («Alpine-Editorial», Fraunces/Inter Tight, Gewürzpalette von Salz bis
> Paprika). Die wurde verworfen. Wer dort nachliest, liest über eine Seite, die
> es nicht mehr gibt.

## Haltung

Sternegastronomie ohne Steifheit. Die Seite darf zeigen, dass Kochen Freude
macht — der Ton ist warm und leicht selbstironisch, nie albern. Der Inhalt
bleibt sachlich: Auszeichnungen, Stationen, Gerichte. Das Spielerische liegt in
der Ausführung, nicht im Text.

Konkret heisst das: helle Flächen, pastellige Farbchips, handschriftlich
schiefe Winkel von Bruchteilen eines Grads, und Gemüse, das über den Rand
schwebt und antwortet, wenn man es anklickt.

## Farben

Alle als Custom Properties auf `:root`. Keine Farbe steht direkt im Markup.

**Grundflächen**

| Token       | Wert      | Rolle                 |
| ----------- | --------- | --------------------- |
| `--bg`      | `#ffffff` | Standard-Hintergrund  |
| `--bg-soft` | `#fbfaf7` | abgesetzte Abschnitte |

**Schrift und Linien** — eine Tinte in vier Deckungsgraden, statt vier Grautöne:

`--ink` `#2f3538` · `--ink-70` · `--ink-55` · `--ink-45` · `--rule` (8 %)

**Marke** — sparsam, für Logo, Akzente und Auszeichnungen:

`--green` `#2a4d38` · `--gold` `#c5a059`

**Pastell-Chips** — tragen das Verspielte. Sie liegen hinter Überschriftenwörtern,
Karten und Icon-Kreisen; nie unter Fliesstext.

`--mint` `#dff0e3` · `--mint-deep` `#cfe8d6` · `--cream` `#faf0d2` ·
`--rosa` `#f7dee2` · `--blau` `#e0ecf4` · `--pfirsich` `#f9e3d4` ·
`--flieder` `#eae3f2` · `--kraut` `#e8f0dc` · `--sand` `#eee9df` ·
`--spirale` `#e9dfc8`

Die Chips werden **zyklisch** durchlaufen, nicht semantisch zugeordnet: Die
Karten einer Sektion nehmen `cardColors[index % 4]`. Eine fünfte Karte wiederholt
darum die erste Farbe — beabsichtigt, es soll nach Vielfalt aussehen, nicht nach
System.

## Die Marke

Ein Lorbeerzweig: Stiel, drei grüne Blätter, an der Spitze ein viertes in Gold.
Lorbeer, weil er eine echte Zutat ist und keine abstrakte Form — er bleibt
erkennbar, auch wenn er nur 26 px hoch ist. Das goldene Blatt ist der einzige
Akzent; es trägt dieselbe Kontur wie die anderen drei und unterscheidet sich
allein in der Farbe. Wer zusätzlich die Form ändert, macht daraus ein zweites
Motiv statt einer Betonung.

`apps/web/public/titz-mark.svg` ist die Marke, `favicon.svg` dieselbe Zeichnung
mit einem `prefers-color-scheme`-Block, der den Zweig auf einem dunklen Tab auf
`--mint` hebt; das Gold bleibt in beiden Fällen Gold. Beide sind
Outline-Zeichnungen ohne Füllung — Strichbreite 1.5 wie im Icon-Set, runde Enden.

| Ort     | Grösse  |
| ------- | ------- |
| Kopf    | 26 × 26 |
| Fuss    | 42 × 42 |
| Favicon | frei    |

Die Box ist quadratisch (`viewBox="2.50 3.55 19.00 19.00"`); der Zweig füllt sie
in der Höhe zu 97 % und in der Breite zu 65 %, ist also bewusst schmal und hoch.
Wer die Blätter ändert, rechnet die Box neu — sonst sitzt die Zeichnung nicht
mehr in der Mitte.

**Die Blätter dürfen nicht schmaler werden.** Ihre Mitte bleibt nur offen,
solange zwei Strichkanten plus Zwischenraum je drei Pixel breit sind. Eine
frühere Fassung war 1.2 Einheiten breit: ab 26 px berührten sich die Kanten und
das goldene Blatt wurde zur Fläche. Jetzt sind es 1.75 bis 2.05. Bei 16 px
schliesst sich die Mitte trotzdem — das ist die Auflösungsgrenze, keine
Nachlässigkeit, und dort liest die Marke als kleine Pflanze mit hellem Kopf.

## Typografie

Eine Schrift für alles: **Space Grotesk**, als Variable Font von 300 bis 700 aus
`apps/web/public/fonts/` — nicht mehr von Google Fonts.

Der Grund ist Messung, nicht Prinzip: Die Stage hat kein Bild, das LCP-Element
ist die Überschrift. Der Font lag damit auf dem kritischen Pfad, und der Weg
dorthin führte über eine rendersperrende CSS-Datei auf `fonts.googleapis.com`,
in der erst die Adresse der Schriftdatei auf `fonts.gstatic.com` stand — zwei
DNS-Auflösungen und zwei TLS-Handshakes vor dem ersten Zeichen. Jetzt sind es
21 KB von derselben Herkunft wie das HTML, mit `immutable`-Cache und `preload`.
Eine Datei deckt alle Schnitte ab. Geometrische Grotesk mit leichten Eigenheiten — passt zum
Ton, ohne dekorativ zu werden.

- **H1** in der Stage: jedes Wort in einem eigenen Pastell-Chip, jeder Chip
  einzeln gekippt (`-1.2deg`, `0.8deg`, `-0.6deg`). Die Wörter entstehen aus
  `stage.headline` durch Trennen am Punkt — «Authentisch. Regional. Exzellent.»
  wird zu drei Zeilen. Wer die Überschrift im CMS ändert, ändert damit die
  Zeilenzahl.
- **Eyebrow**: 11 px, Grossbuchstaben, `letter-spacing: 0.3em`, in `--ink-45`.
  Steht über jeder Sektionsüberschrift und kommt aus dem Feld `eyebrow`.
- **Fliesstext**: 17 px, `line-height: 1.7`, `--ink-70`, maximal 520 px breit.
- **Inhaltsbreite** `--max-width: 1080px`.

## Bewegung

Vierzehn Keyframes, alle mit Präfix `tz`: `tzBob`, `tzSway`, `tzDriftX`,
`tzFloatSpin`, `tzPulse`, `tzBreath`, `tzHop`, `tzOrbit`, `tzSwing`, `tzTip`,
`tzStretch`, `tzWobble`, `tzSpiralZoom`, `tzToast`.

Prinzip: **langsam, versetzt, endlos.** Laufzeiten zwischen 4,4 s und 9 s, jede
Instanz mit eigener Verzögerung. Nichts läuft synchron — sonst wirkt es wie eine
Animation statt wie Leben.

Zwei feste Elemente:

- **Fibonacci-Spirale** rechts oben in der Stage, aus `apps/web/src/scripts/playful.ts`
  gezeichnet, in `--spirale`, mit `tzSpiralZoom` sehr langsam skalierend.
- **Scroll-Reveal**: Elemente mit `data-rev` starten mit `.rev-hidden` und
  werden per `IntersectionObserver` freigegeben, gestaffelt um
  `data-rev`-Millisekunden.

## Das Gemüse-Easter-Egg

Der eigentliche Charakter der Seite und vollständig CMS-gesteuert.

**Aufbau.** Die Collection `icons` enthält 26 SVGs: 18 Gemüse und Früchte plus
8 UI-Icons. Jedes Gemüse-Icon trägt ein Array `toasts` mit Sprüchen. Ein Icon
**mit** Sprüchen zählt als entdeckbare «Zutat» — die Zahl im Hinweistext ergibt
sich daraus, sie steht nirgends fest.

**Darstellung.** `Egg.astro` platziert ein Icon frei positioniert
(`pos`, `anim`, `bg`, `size`) über einer Sektion; `IconCircle.astro` setzt es in
den Fluss, etwa auf einer Karte. Beide rendern das `svg`-Feld inline, damit es
`currentColor` erbt.

**Interaktion.** Klick zeigt einen Toast. Mehrere Sprüche wechseln sich bei
wiederholtem Klick ab. Sind alle Zutaten gefunden, erscheint
`site-settings.easterEggs.completionToast`. Sprüche mit `✦` am Ende sind eine
zweite, versteckte Ebene — Anspielungen für die, die weiterklicken;
`starToast` gehört dazu.

**Datenweg.** `Base.astro` bettet die Toast-Daten als JSON in
`<script type="application/json" id="egg-data">` ein, `playful.ts` liest sie.
Kein Netzwerkaufruf im Browser, kein Framework — 94 Zeilen Vanilla-TypeScript.

Wer einen Spruch ändern will, tut es im Admin unter **Assets → Icons**. Kein
Deploy nötig über den Code — nur der Rebuild, den der Hook auslöst.

## Sektionen

Eine Seite setzt sich aus Blocks zusammen; jeder Block hat eine Komponente unter
`apps/web/src/components/sections/`:

| Block                    | Komponente              | Inhalt                                               |
| ------------------------ | ----------------------- | ---------------------------------------------------- |
| `philosophie`            | `Philosophie.astro`     | Text, Zitat, Werte-Karten mit Icons                  |
| `signatureDishesSection` | `SignatureDishes.astro` | Gerichte aus `signature-dishes`                      |
| `visitSection`           | `Visit.astro`           | Restaurant PINOT, Adresse, Öffnungszeiten, CTAs      |
| `stationenSection`       | `Stationen.astro`       | Lebenslauf: Zeitleiste, Skills, Ausbildung, Freizeit |
| `angeboteSection`        | `Angebote.astro`        | Beratung und Catering aus `angebote`                 |
| `newsSection`            | `News.astro`            | Presse und Auszeichnungen aus `news`                 |
| `richTextSection`        | `RichTextSection.astro` | Fliesstext für Impressum und Datenschutz             |

`SectionRenderer.astro` verteilt über ein `switch` auf `blockType`. Ein neuer
Block im CMS bricht dort den Typcheck, bis er einen Fall bekommt — Absicht.

## Technische Regeln

- **Kein CSS-Framework.** Natives CSS mit Custom Properties, dazu Astros
  Scoped Styles je Komponente. Tailwind würde hier nichts lösen: Es gibt keine
  geteilte Utility-Sprache über Komponentengrenzen hinweg, und die Pastell-Chips
  sind ohnehin Tokens.
- **Kein Client-Framework.** Das einzige Skript ist `playful.ts`.
- Farben immer über Tokens. Steht ein Hex-Wert im Markup, fehlt ein Token.
- Bilder in der Zielgrösse hochladen — auf Workers gibt es kein `sharp`, also
  keine Varianten (siehe [ARCHITECTURE.md](ARCHITECTURE.md)).
- Die Kipp-Winkel bleiben unter 1,5°. Darüber sieht es nach Fehler aus statt
  nach Absicht.
