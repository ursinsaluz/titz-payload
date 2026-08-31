import { expect, test } from '@playwright/test'

/**
 * Die kritischen Pfade — und nur die.
 *
 * Der Build selbst ist der eigentliche Integrationstest: Astro holt den Content
 * über REST, Zod prüft ihn (`src/lib/schemas.ts`), und jede Komponente muss
 * fehlerfrei rendern, sonst gibt es kein `dist/`. Diese Tests prüfen darum das,
 * was ein grüner Build noch offen lässt: dass das Ergebnis auch ausgeliefert
 * wird und der Inhalt tatsächlich im HTML steht statt in einer leeren Hülle.
 */

test('Startseite antwortet mit 200 und trägt den Content aus dem CMS', async ({ page }) => {
  const antwort = await page.goto('/')
  expect(antwort?.status()).toBe(200)

  // Aus dem Global `header` (stage.headline) — kommt die H1 nicht, ist entweder
  // das CMS-Feld weg oder Stage.astro rendert leer.
  await expect(page.locator('h1')).toBeVisible()

  // Aus den Sektionsblöcken der Seite `home`. Eine leere Hülle hätte ein
  // <main>, aber keine Sektionen darin.
  await expect(page.locator('main section').first()).toBeVisible()
  expect(await page.locator('main section').count()).toBeGreaterThan(2)

  await expect(page.locator('footer')).toBeVisible()
})

test('Die Sektionen der Startseite kommen aus dem CMS, nicht aus Platzhaltern', async ({
  page,
}) => {
  await page.goto('/')

  // Die Anker stehen im Content-Modell und tragen die Navigation. Fehlen sie,
  // zeigen alle Menülinks ins Leere, ohne dass sonst etwas auffällt.
  for (const anker of ['philosophie', 'dishes', 'angebote', 'aktuelles']) {
    await expect(page.locator(`#${anker}`)).toHaveCount(1)
  }

  // Die Navigation kommt aus `header.nav`.
  expect(await page.locator('.site-header__nav a').count()).toBeGreaterThan(1)
})

test('Eine dynamische Unterseite antwortet mit 200', async ({ page }) => {
  const antwort = await page.goto('/impressum')
  expect(antwort?.status()).toBe(200)
  await expect(page.locator('main h1')).toBeVisible()
})

test('Eine unbekannte Adresse liefert die 404-Seite, keinen Serverfehler', async ({ page }) => {
  const antwort = await page.goto('/gibt-es-nicht')
  // `astro preview` liefert 404; hinter Workers Assets greift
  // `not_found_handling: "404-page"` mit demselben Ergebnis.
  expect(antwort?.status()).toBe(404)
})

test('Keine Konsolenfehler beim Laden', async ({ page }) => {
  const fehler: string[] = []
  page.on('console', (nachricht) => {
    if (nachricht.type() === 'error') fehler.push(nachricht.text())
  })
  page.on('pageerror', (ausnahme) => fehler.push(String(ausnahme)))

  await page.goto('/')
  // Das Easter-Egg-Skript liest `#egg-data` und registriert Klick-Handler —
  // ein Fehler darin bliebe sonst unbemerkt, weil die Seite trotzdem aussieht
  // wie immer.
  await page.waitForLoadState('load')

  // Bilder aus dem CMS werden hier bewusst nicht mitgezählt: Sie liegen auf
  // admin.titz.cooking, und ein Netzwerkfehler dort ist kein Frontend-Fehler.
  const echte = fehler.filter((text) => !/Failed to load resource|net::ERR/i.test(text))
  expect(echte).toEqual([])
})
