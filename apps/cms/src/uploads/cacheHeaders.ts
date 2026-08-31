/**
 * Cache-Kopfzeile für ausgelieferte Uploads (Bilder, Icon-SVGs).
 *
 * Der R2-Handler von Payload setzt selbst keine `Cache-Control`-Kopfzeile —
 * gemessen am 31.08.2026 kam jede Datei von `admin.titz.cooking` ohne. Ohne
 * Angabe darf Cloudflare eine Worker-Antwort nicht zwischenspeichern, also
 * kostet jedes Bild auf titz.cooking eine Worker-Invocation samt D1-Abfrage
 * und R2-Zugriff. Das Frontend ist statisch — die Bilder sind damit das
 * Einzige, was bei jedem Seitenaufruf noch durch die ganze Kette läuft.
 *
 * `immutable` ist hier vertretbar, weil Payload einen belegten Dateinamen nicht
 * überschreibt, sondern hochzählt (`bild-1.webp`): Ein ausgetauschtes Bild
 * bekommt eine neue Adresse. Die eine Ausnahme ist, den Datensatz zu löschen
 * und danach eine andere Datei unter genau demselben Namen hochzuladen — dann
 * muss der Name geändert werden, sonst sehen Besucher bis zu ein Jahr lang das
 * alte Bild.
 */
export const uploadCacheHeaders = ({ headers }: { headers: Headers }): Headers => {
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  return headers
}
