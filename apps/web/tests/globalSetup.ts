import { execFileSync } from 'node:child_process'

/**
 * Startet und stoppt den Preview-Server um die Testreihe herum.
 *
 * Playwrights `webServer` funktioniert hier nicht: `astro preview` legt sich ab
 * Astro 7 selbst in den Hintergrund, wenn kein Terminal am Prozess hängt.
 * Playwright sieht dann einen Prozess, der sofort endet, und bricht mit
 * «exited early» ab — obwohl der Server läuft. Astro bringt für diesen Fall
 * `--background` samt `stop` mit, und genau das wird hier benutzt.
 */
const PORT = Number(process.env.PREVIEW_PORT ?? 4321)
const ADRESSE = `http://localhost:${PORT}/`

const astro = (...args: string[]) =>
  execFileSync('pnpm', ['exec', 'astro', 'preview', ...args], { stdio: 'inherit' })

const antwortet = async () => {
  try {
    await fetch(ADRESSE, { signal: AbortSignal.timeout(1500) })
    return true
  } catch {
    return false
  }
}

const schlafen = (ms: number) => new Promise((weiter) => setTimeout(weiter, ms))

export default async function globalSetup() {
  // Einen von Astro verwalteten Server abräumen — etwa aus einem Lauf, der
  // abgebrochen wurde.
  try {
    astro('stop')
  } catch {
    /* keiner da */
  }

  /**
   * Ein fremder Prozess auf dem Port ist der gefährliche Fall, und er ist schon
   * eingetreten: `astro preview --port 4321` weicht bei belegtem Port still auf
   * 4322 aus, Playwrights `baseURL` bleibt aber auf 4321. Die Tests laufen dann
   * gegen den fremden Server — einmal einen Lauf lang gegen einen verwaisten
   * Preview-Server mit einem veralteten `dist/`, mit Fehlschlägen, die nach
   * kaputtem Content aussahen und keiner waren.
   *
   * Darum hier abbrechen statt weitermachen. Ein Fehler, der den Port nennt,
   * ist in zehn Sekunden behoben; ein Testlauf gegen den falschen Server kostet
   * eine halbe Stunde Fehlersuche.
   */
  if (await antwortet()) {
    throw new Error(
      `Auf Port ${PORT} antwortet schon etwas, das Astro nicht verwaltet.\n` +
        `Die Tests würden gegen diesen fremden Server laufen, nicht gegen den ` +
        `frischen Build.\n\n` +
        `    lsof -ti:${PORT} | xargs kill\n\n` +
        `Oder mit PREVIEW_PORT=<frei> einen anderen Port wählen.`,
    )
  }

  astro('--background', '--port', String(PORT))

  for (let versuch = 0; versuch < 40; versuch++) {
    if (await antwortet()) {
      return () => {
        try {
          astro('stop')
        } catch {
          /* schon beendet */
        }
      }
    }
    await schlafen(500)
  }

  throw new Error(`Preview-Server auf ${ADRESSE} ist nicht hochgekommen.`)
}
