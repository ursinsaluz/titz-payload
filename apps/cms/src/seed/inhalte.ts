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
} as const

export type MedienSchluessel = keyof typeof MEDIEN

/** Toast-Sprüche pro Gemüse-Icon (aus dem Verspielt-Design). */
export const VEG_TOASTS: Record<string, string[]> = {
  zwiebel: [
    'Die Zwiebel — das einzige Mise en Place, das zurückweint.',
    'Die Roter-Nebel-Zwiebel weint übrigens zurück. In Farben. ✦',
  ],
  knoblauch: [
    'Knoblauch: das Fundament jeder guten Küche. Und jedes freien Abends.',
    'Anzati-Rotzknoblauch hat der Guide Michelin nie berücksichtigt. Zu Recht. ✦',
  ],
  tomate: [
    'Wissen: Die Tomate ist eine Frucht. Weisheit: Sie kommt trotzdem nicht ins Dessert.',
    'In einer weit entfernten Galaxie heisst sie Topato. Ja, wirklich. ✦',
  ],
  kuerbis: [
    'Der Kürbis bleibt bis Mitternacht — danach fährt er als Kutsche heim.',
    'Nicht zu verwechseln mit dem Blähkürbis. Der bläht. ✦',
  ],
  karotte: [
    'Karotten sind gut für die Augen. Oder hast du je ein Kaninchen mit Brille gesehen?',
    'Die Raum-Karotte schmeckt exakt gleich. Nur weiter weg. ✦',
  ],
  radieschen: ['Das Radieschen: klein, scharf, ehrlich.'],
  lauch: ['Der Lauch steht immer gerade. Haltung ist alles.'],
  beeren: ['Beeren — der Grund, warum der Sommer kurz sein darf.'],
  kraeuter: ['Kräuter über Fläsch: gepflückt, nicht bestellt.'],
  spargel: ['Weisser Spargel: schläft unter der Erde und ist trotzdem der Star.'],
  pilz: [
    'Pilze — der Wald schickt Vorräte.',
    'Schwammgemüse ist KEIN Ersatz. Egal, was die Cantina sagt. ✦',
  ],
  quitte: ['Die Quitte: zu hart zum Reinbeissen, zu gut zum Weglassen.'],
  randen: ['Randen färben alles. Vor allem die Meinung.'],
  kohl: [
    'Kohl braucht Frost und Geduld. Wie gute Gäste.',
    'See-Kohl gibt es nur auf Mon Cala. Wir bleiben beim Bündner. ✦',
  ],
  baumnuss: ['Baumnüsse: das Dessert wächst am Baum.'],
  apfel: ['Lageräpfel — Geduld, die man schmeckt.'],
  birne: ['Die Birne wartet, bis du wegschaust. Dann ist sie reif.'],
  ananas: [
    'Die Ananas trägt als Einzige eine Krone. Exzellenz eben. (Ja — botanisch eine Frucht. Kronen kennen keine Schubladen.)',
  ],
}
