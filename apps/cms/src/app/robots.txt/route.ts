/**
 * `robots.txt` für admin.titz.cooking.
 *
 * Ohne diese Datei antwortet der Worker mit 404, und für Crawler heisst das:
 * alles erlaubt. Der CMS-Worker ist von titz.cooking aus über jedes
 * `<img src>` verlinkt, wird also gefunden — und `/api/*` liefert öffentlich
 * JSON, das als dünner, duplizierter Inhalt indexiert werden kann und jeden
 * Abruf als Worker-Request kostet.
 *
 * Ein pauschales `Disallow: /` wäre falsch: `apps/web/public/robots.txt` sagt
 * ausdrücklich, dass die Bilder in der Bildersuche erscheinen sollen, und die
 * liegen unter `/api/media/file/`. Google muss diese URLs also crawlen dürfen.
 * Reihenfolge und Spezifität sind hier entscheidend — `Allow` gewinnt gegen
 * `Disallow`, wenn das Muster länger ist.
 */
export const dynamic = 'force-static'

const REGELN = `User-agent: *
Allow: /api/media/file/
Allow: /cdn-cgi/image/
Disallow: /api/
Disallow: /admin/
`

export function GET(): Response {
  return new Response(REGELN, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Ein Tag. Die Datei ändert sich praktisch nie, aber ein Fehler darin
      // soll nicht ein Jahr lang am Rand kleben.
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
