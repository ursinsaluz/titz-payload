import { execFileSync } from 'node:child_process'

/**
 * Startet und stoppt den Preview-Server um die Testreihe herum.
 *
 * Playwrights `webServer` funktioniert hier nicht: `astro preview` legt sich
 * ab Astro 7 selbst in den Hintergrund, wenn kein Terminal am Prozess hängt.
 * Playwright sieht dann einen Prozess, der sofort endet, und bricht mit
 * «exited early» ab — obwohl der Server läuft. Astro bringt für diesen Fall
 * `--background` samt `stop` mit, und genau das wird hier benutzt.
 */
const PORT = process.env.PREVIEW_PORT ?? '4321'

const astro = (...args: string[]) =>
  execFileSync('pnpm', ['exec', 'astro', 'preview', ...args], { stdio: 'inherit' })

export default function globalSetup() {
  astro('--background', '--port', PORT)
  return () => astro('stop')
}
