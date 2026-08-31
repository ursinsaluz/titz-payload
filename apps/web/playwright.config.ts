import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke-Tests gegen den fertigen Build, nicht gegen den Dev-Server.
 *
 * `astro preview` liefert genau das aus, was auch bei Cloudflare landet — der
 * Dev-Server würde on demand neu rendern und andere Fehler verdecken. `pnpm
 * build` muss also vorher gelaufen sein; `tests/globalSetup.ts` startet nur den
 * Server.
 *
 * Bewusst schmal gehalten: geprüft wird, dass die Seite antwortet und dass der
 * Content aus dem CMS im HTML angekommen ist. Keine Farben, keine Abstände,
 * keine Hover-Zustände — die würden bei jeder Design-Änderung brechen und nichts
 * über die Funktion aussagen.
 */
const PORT = Number(process.env.PREVIEW_PORT ?? 4321)

export default defineConfig({
  testDir: './tests',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalSetup: './tests/globalSetup.ts',
})
