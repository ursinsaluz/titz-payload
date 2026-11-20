/**
 * Die Inhaltsbausteine, die nicht nur der Seed braucht.
 *
 * Eigene Datei, weil `seed/index.ts` beim Import sofort `run()` ausführt: Ein
 * Skript, das von dort nur eine Konstante holen will, würde damit einen
 * kompletten Seed anstossen und die Datenbank leerräumen.
 */

/**
 * Die Bilder des Seeds — Dateien aus `assets/media/`, nicht Adressen.
 *
 * Vorher holte `uploadFromUrl` sie von `https://titz.cooking/_astro/image.*.webp`,
 * also von der Seite, die dieser Seed gerade ersetzt. Sobald die neue Version
 * live war, gab es diese Adressen nicht mehr: Der Seed am 06.07.2026 schrieb
 * darum 11 Byte `text/plain` in jedes Bild, und auf titz.cooking waren
 * anschliessend alle Bilder 404. Ein Seed darf nicht von seinem eigenen
 * Ergebnis abhängen — die Quelle liegt jetzt im Repo.
 *
 * Der Schlüssel ist die Rolle im Inhalt, nicht der Dateiname: So bleibt
 * erkennbar, wofür ein Bild da ist, wenn es später ausgetauscht wird.
 */
export const MEDIEN = {
  portrait: { datei: 'portrait-titz.webp', alt: 'Sebastian Titz in der Küche' },
  pinotTisch: { datei: 'pinot-tisch.webp', alt: 'Gedeckter Tisch im Restaurant Pinot' },
  pinotTeller: { datei: 'pinot-teller.webp', alt: 'Angerichteter Teller im Restaurant Pinot' },
  kuecheFinish: { datei: 'kueche-finish.webp', alt: 'Letzter Handgriff am Teller' },
  anrichten: { datei: 'titz-anrichten.webp', alt: 'Sebastian Titz beim Anrichten' },
  instagram: { datei: 'instagram.svg', alt: 'Instagram' },
  gelbsenf: {
    datei: 'adanks-biofarm-flaescher-gelbsenf.webp',
    alt: 'Etikette Fläscher Gelbsenf von Adanks Biofarm, hergestellt von Chefkoch Sebastian Titz',
  },
  braunsenf: {
    datei: 'adanks-biofarm-flaescher-braunsenf.webp',
    alt: 'Etikette Fläscher Braunsenf von Adanks Biofarm, hergestellt von Chefkoch Sebastian Titz',
  },
  knoblauchsenf: {
    datei: 'adanks-biofarm-knoblauch-senf.webp',
    alt: 'Etikette Knoblauch-Senf von Adanks Biofarm, hergestellt von Chefkoch Sebastian Titz',
  },
  safransenf: {
    datei: 'adanks-biofarm-safran-senf.webp',
    alt: 'Etikette Safran-Senf von Adanks Biofarm, hergestellt von Chefkoch Sebastian Titz',
  },
  kraeuterBild: {
    datei: 'kraeuter-tour-sebastian-titz-pinot.webp',
    alt: 'Sebastian Titz bei der Kräutertour im Garten des Restaurant PINOT in Fläsch',
  },
} as const

export type MedienSchluessel = keyof typeof MEDIEN

/** Toast-Sprüche pro Gemüse-Icon (aus dem Verspielt-Design + erweiterte Film-/Küchensprüche). */
export const VEG_TOASTS: Record<string, string[]> = {
  zwiebel: [
    'Die Zwiebel — das einzige Mise en Place, das zurückweint.',
    'Zwiebeln haben Schichten — wie Oger, oder Köche, die sind sogar sehr vielschichtig.',
    'Die Roter-Nebel-Zwiebel weint übrigens zurück. In Farben. ✦',
    'Keine Tränen beim Brunoise-Schneiden? Die Macht ist stark in diesem.',
    'Zwiebel-Mirepoix ohne Chichi — aber wer sie verbrennt, hört Ezekiel 25,17.',
    'Keine Schalotte im Haus? Gusteau sagt, jeder kann kochen — nimm rote Zwiebel.',
  ],
  knoblauch: [
    'Knoblauch: das Fundament jeder guten Küche. Und jedes freien Abends.',
    'Anzati-Rotzknoblauch hat der Guide Michelin nie berücksichtigt. Zu Recht. ✦',
    'Eine Zehe zu wenig im Ansatz? Wir reden hier von Knoblauch — nicht vom metrischen System.',
    'Knoblauch in zu heissem Öl verbrennen? Ich finde deinen Mangel an Geduld beklagenswert.',
    'Vampire haben in Fläsch Hausverbot, seit wir regionalen Bio-Knoblauchsenf im Glas haben.',
  ],
  tomate: [
    'Wissen: Die Tomate ist eine Frucht. Weisheit: Sie kommt trotzdem nicht ins Dessert.',
    'In einer weit entfernten Galaxie heisst sie Topato. Ja, wirklich. ✦',
    'Drei Tomaten gehen durch die Küche. Eine trödelt beim Passieren — zack: Ketchup!',
    'Eine gute Tomatensauce reduziert so lange ein, bis ihr Umami unvermeidlich ist.',
    'Tomaten im tiefsten Winter kaufen? Ich finde Ihren Mangel an Saisonglauben beklagenswert.',
  ],
  kuerbis: [
    'Der Kürbis bleibt bis Mitternacht — danach fährt er als Kutsche heim.',
    'Nicht zu verwechseln mit dem Blähkürbis. Der bläht. ✦',
    'Um Mitternacht wird keine Kutsche draus, sondern eine Kürbissuppe mit Fläscher Safran-Note.',
    'Manches schmeckt vielleicht nach Kürbiskuchen — unser gerösteter Butternut schlägt aber alles.',
    'Ein Riesen-Kürbis auf dem Brett? Das ist kein Mond — das ist das ganze Herbstmenü.',
  ],
  karotte: [
    'Karotten sind gut für die Augen. Oder hast du je ein Kaninchen mit Brille gesehen?',
    'Die Raum-Karotte schmeckt exakt gleich. Nur weiter weg. ✦',
    'Olaf hätte sie gern als Nase, wir werfen sie lieber direkt ins kräftige Rinderfond-Mirepoix.',
    'Eine krumme Bio-Karotte aussortieren? Nach meiner Form beurteilst du mich? Geschmack zählt.',
    'Glanz auf der Karotte braucht kühle Butter und Ruhe — genau wie ein kalt serviertes Gericht.',
  ],
  radieschen: [
    'Das Radieschen: klein, scharf, ehrlich.',
    'Nach meiner Grösse beurteilst du mich? Klein, scharf und unterschätzt — genau wie Radieschen.',
    'Frische Radieschen, gutes Brot, etwas Salz und Fläscher Butter — das ist ein Bingo!',
    'Kurz in Eiswasser gelegt, knackt das Radieschen lauter als Colettes perfekte Brotkruste.',
  ],
  lauch: [
    'Der Lauch steht immer gerade. Haltung ist alles.',
    'Das grüne Ende vom Lauch wegwerfen? Ich finde Ihren Mangel an Fond-Glauben beklagenswert.',
    'Lauch gründlich waschen? Du warst mein Bruder im Topf — aber Sand verzeiht kein Gast.',
    'Weisser Lauch ins Gemüse, sattes Grün ab in den Fond: So hält man den Posten im Gleichgewicht.',
  ],
  beeren: [
    'Beeren — der Grund, warum der Sommer kurz sein darf.',
    'Pepper Potts ist gegen Erdbeeren allergisch — gut, dass unsere Beeren allein für dich sind.',
    'Aufgepasst beim Einkochen ohne Deckel: Die erste Spritzer-Beere auf der weissen Jacke ist eine Falle!',
    'Frische Beeren direkt vom Strauch naschen, statt alles zu passieren? Einmal kurz: Hakuna Matata.',
  ],
  kraeuter: [
    'Kräuter über Fläsch: gepflückt, nicht bestellt.',
    'Junge Rosmarinspitzen in die Beurre blanc: wenig Worte, volle Wucht — «Ich bin Groot» in Grün.',
    'Getrocknet gegen frisch vom PINOT-Beet? Du musst verlernen, was du über Lorbeer gelernt hast.',
    'Wilder Oregano von der Steinmauer, kalt gepresst — in Paris wäre das ein «Royale mit Kräuteröl».',
  ],
  spargel: [
    'Weisser Spargel: schläft unter der Erde und ist trotzdem der Star.',
    'Es ist vorbei, Spargel! Der Sparschäler steht deutlich über dir.',
    'Spargel mit Beurre blanc? Attendez la crème — gute Emulsion braucht Geduld.',
    'Spargelzeit in der Bündner Herrschaft: Wir lieben sie 3000 — aber nur bis Juni.',
  ],
  pilz: [
    'Pilze — der Wald schickt Vorräte.',
    'Schwammgemüse ist KEIN Ersatz. Egal, was die Cantina sagt. ✦',
    'Einen unbekannten Waldpilz blind in die Pfanne werfen? Ich hab da ein ganz mieses Gefühl.',
    'Herbstlicher Steinpilz-Fond mit frischem Thymian — sagt man das so: «Das ist ein Bingo»?',
    'Für Steinpilze in heisser Nussbutter braucht es keine Macht — nur Timing und Respekt.',
  ],
  quitte: [
    'Die Quitte: zu hart zum Reinbeissen, zu gut zum Weglassen.',
    'Roh steinhart, geschmort ein Gedicht — die Quitte ist der Bruce Banner unter den Früchten.',
    'Roh in eine frische Quitte gebissen? Beeindruckend, höchst beeindruckend — und mutig.',
    'Vergifteter Apfel unnötig: Eine rohe Quitte legt auch ohne böse Hexe jeden Kiefer lahm.',
  ],
  randen: [
    'Randen färben alles. Vor allem die Meinung.',
    'Nach dem Randen-Schälen sehen die Hände aus wie nach einer Szene bei Tarantino.',
    'Randen im Ofen langsam rösten: Tu es oder tu es nicht — halbweich gibt es kein Versuchen.',
    'Warum meine Kochschürze pink ist? Das ist mein Geheimnis, Cap: Ich verarbeite Randen.',
  ],
  kohl: [
    'Kohl braucht Frost und Geduld. Wie gute Gäste.',
    'See-Kohl gibt es nur auf Mon Cala. Wir bleiben beim Bündner. ✦',
    'Kohl sei langweilig? Unterschätze niemals die dunkle Seite kräftiger Röstaromen.',
    'Aus Weisskohl ein Sternemenü zaubern? Grosse Künstler werden eben auch auf dem Acker geboren.',
    'Langsam geschmort mit Kümmel und Geduld: «Ich kann das den ganzen Tag machen» — jeder Schmortopf.',
  ],
  baumnuss: [
    'Baumnüsse: das Dessert wächst am Baum.',
    'Sobald die Baumnüsse in der Pfanne duften: «Diese Party ist vorbei!» — sofort raus auf kaltes Blech.',
    'Baumnuss-Pesto niemals heiss kochen — Rache und gute Nuss-Öl-Emulsion serviert man kalt.',
    'Leicht geröstet, fein gehackt: Eine Prise Baumnuss bringt jeden Teller ins perfekte Gleichgewicht.',
  ],
  apfel: [
    'Lageräpfel — Geduld, die man schmeckt.',
    'Dieser Apfel kommt direkt vom Bündner Baum — ganz ohne Hexe, dafür zu Spekulatius-Eis.',
    'Apfelstrudel im PINOT? Vergiss die Zigarette — aber bitte unbedingt: «Attendez la crème!»',
    'Granny Smith statt Braeburn im Kompott? «Ich ändere den Deal. Betet, dass ich ihn nicht noch weiter ändere.»',
  ],
  birne: [
    'Die Birne wartet, bis du wegschaust. Dann ist sie reif.',
    'Wenn süsse Birne auf reifen Käse trifft, zündet im Mund das kleine Ratatouille-Feuerwerk.',
    'Kein raffinierter Zucker, sondern regionales Birnell im Fläscher Senf — das ist der Weg.',
    'Pochierte Birne mit Rahm auf dem Pass? Genau der richtige Moment für «Attendez la crème!».',
  ],
  ananas: [
    'Die Ananas trägt als Einzige eine Krone. Exzellenz eben. (Ja — botanisch eine Frucht. Kronen kennen keine Schubladen.)',
    "Wer wohnt in 'ner Ananas ganz tief im Meer? Egal — bei uns landet sie scharf gegrillt auf dem Teller.",
    'Rohe Ananas in Gelatine? Bromelain sagt «Ich bin unvermeidlich» — vorher immer kurz aufkochen!',
    'Ein Big Kahuna Burger braucht gegrillte Ananas — und ja, das ist ein verdammt leckerer Burger.',
  ],
}
