import type { Access } from 'payload'

/**
 * Wer welche Bilder lesen darf.
 *
 * `media` stand auf `read: () => true`. Damit war am 01.09.2026 messbar:
 *
 *   GET /api/media?where[kategorie][equals]=privat  → 200, totalDocs: 23
 *   GET /api/media/file/privat-nacht-01.jpg         → 200
 *
 * Ohne Anmeldung. Nicht nur abrufbar, sondern **auflistbar** — man holt sich die
 * Namen aller privaten Aufnahmen und lädt sie dann einzeln herunter. Die
 * Bibliothek enthält 36 Bilder mit `verwendung: intern`, eines mit `archiv` und
 * 23 in der Kategorie `privat`: Familien- und Reiseaufnahmen.
 *
 * Das Feld `verwendung` war von Anfang an dafür gedacht, Bildmaterial für die
 * Seite von privaten Aufnahmen zu trennen — nur hat es niemand ausgewertet.
 *
 * Payload nimmt aus einer Access-Funktion auch ein `where`-Objekt an und hängt
 * es als Bedingung an die Abfrage. Das gilt ausdrücklich auch für die
 * Datei-Route: `checkFileAccess` fügt die Bedingung neben dem Dateinamen ein.
 * Eine eingeschränkte Leseregel schützt also Liste **und** Datei.
 */
export const mediaLesen: Access = ({ req }) => {
  if (req.user) return true

  /**
   * `not_in` und nicht `equals: 'web'`: Die sechs Bilder, die das Frontend
   * benutzt, stammen aus der Zeit vor diesem Feld. Sie stehen heute auf `web`,
   * aber ein Datensatz ohne gesetztes Feld würde bei `equals` stillschweigend
   * aus der Seite verschwinden — und das fiele erst auf, wenn ein Bild fehlt.
   * Ausgeschlossen wird darum nur, was ausdrücklich nicht öffentlich ist.
   */
  return { verwendung: { not_in: ['intern', 'archiv'] } }
}
