import { expect, test } from '@playwright/test'
import { hatLexicalInhalt, lexicalToHtml } from '../src/lib/lexical'
import { hrefFor } from '../src/lib/links'
import { einAnlass, istKommenderAnlass } from '../src/lib/schema'

/**
 * UI- und Funktionstests für titz.cooking.
 *
 * Prüft Anlass- und Angebot-Detailseiten, Brotkrumen-Navigation, interaktive
 * Elemente (Easter-Egg-Zähler und Toasts), alle vier WebMCP-Werkzeuge sowie
 * responsiven Viewport ohne horizontalen Überlauf.
 */

test('Anlass-Detailseite antwortet mit 200 und rendert Brotkrumen sowie Event-Schema', async ({
  page,
}) => {
  const antwort = await page.goto('/anlaesse/gourmetabend-im-pinot/')
  expect(antwort?.status()).toBe(200)

  // Titel und Brotkrume
  await expect(page.locator('h1')).toContainText('Gourmetabend')
  const krumeLinks = page.locator('nav.krume a')
  expect(await krumeLinks.count()).toBeGreaterThanOrEqual(2)
  await expect(krumeLinks.first()).toHaveAttribute('href', '/')

  // Strukturiertes Schema (Event)
  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent()
  expect(jsonLd).toBeTruthy()
  const daten = JSON.parse(jsonLd!)
  const graph: Array<Record<string, unknown>> = Array.isArray(daten['@graph'])
    ? daten['@graph']
    : [daten]
  const event = graph.find((item) => item['@type'] === 'Event')
  expect(event).toBeDefined()
  expect(String(event?.name)).toContain('Gourmetabend')
})

test('Angebot-Detailseiten antworten mit 200 und rendern Service-Schema', async ({ page }) => {
  const catering = await page.goto('/angebote/catering/')
  expect(catering?.status()).toBe(200)
  await expect(page.locator('h1')).toContainText('Catering')

  const krumeLinks = page.locator('nav.krume a')
  expect(await krumeLinks.count()).toBeGreaterThanOrEqual(2)

  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent()
  const daten = JSON.parse(jsonLd!)
  const graph: Array<Record<string, unknown>> = Array.isArray(daten['@graph'])
    ? daten['@graph']
    : [daten]
  const service = graph.find((item) => item['@type'] === 'Service')
  expect(service).toBeDefined()
  // Zweites Angebot prüfen
  const beratung = await page.goto('/angebote/beratung/')
  expect(beratung?.status()).toBe(200)
  await expect(page.locator('h1')).toContainText('Beratung')
})

test('Rechtliche Unterseiten sind erreichbar und rendern Überschrift', async ({ page }) => {
  const impressum = await page.goto('/impressum')
  expect(impressum?.status()).toBe(200)
  await expect(page.locator('h1')).toBeVisible()

  const datenschutz = await page.goto('/datenschutz')
  expect(datenschutz?.status()).toBe(200)
  await expect(page.locator('h1')).toBeVisible()
})

test('Gemüse-Easter-Egg zählt gefundene Zutaten und zeigt Toast', async ({ page }) => {
  // Desktop-Viewport setzen, da Eier unter 720px ausgeblendet werden
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.waitForLoadState('load')

  const zaehler = page.locator('[data-egg-count]').first()
  await expect(zaehler).toHaveText('0')

  const erstesEi = page.locator('.egg__btn[data-egg]').first()
  await expect(erstesEi).toBeVisible()
  await erstesEi.click({ force: true })

  // Zähler inkrementiert auf 1
  await expect(zaehler).toHaveText('1')

  // Toast-Nachricht wird eingeblendet
  const toast = page.locator('.toast')
  await expect(toast).toBeVisible()
  expect((await toast.textContent())?.length).toBeGreaterThan(0)
})

test('WebMCP Schema-Endpunkt /webmcp.json liefert valide Struktur', async ({ request }) => {
  const antwort = await request.get('/webmcp.json')
  expect(antwort.status()).toBe(200)
  expect(antwort.headers()['content-type']).toContain('application/json')

  const index = await antwort.json()
  expect(index).toHaveProperty('person')
  expect(Array.isArray(index.angebote)).toBe(true)
  expect(Array.isArray(index.anlaesse)).toBe(true)
  expect(Array.isArray(index.gerichte)).toBe(true)
  expect(Array.isArray(index.aktuelles)).toBe(true)
  expect(Array.isArray(index.stationen)).toBe(true)
})

test('Alle vier WebMCP-Werkzeuge lassen sich erfolgreich ausführen', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('load')

  type ToolAntwort = { content: { type: string; text: string }[] }
  type ToolApi = {
    callTool: (name: string, input?: Record<string, unknown>) => Promise<ToolAntwort>
  }

  const ergebnisse = await page.evaluate(async () => {
    const fenster = window as unknown as Record<string, unknown>
    if (!('titzWebMCP' in fenster)) return null
    const api = fenster.titzWebMCP as ToolApi
    const angebote = await api.callTool('angebote_und_anlaesse', {})
    const profil = await api.callTool('profil_und_stationen', {})
    const anfrage = await api.callTool('anfrage_vorbereiten', {
      anliegen: 'catering',
      nachricht: 'Musterkunde Anfrage für 20 Personen',
    })
    const aktuelles = await api.callTool('aktuelles_und_artikel', { suche: 'Biofarm' })

    return {
      angeboteText: angebote.content[0]?.text ?? '',
      profilText: profil.content[0]?.text ?? '',
      anfrageText: anfrage.content[0]?.text ?? '',
      aktuellesText: aktuelles.content[0]?.text ?? '',
    }
  })

  expect(ergebnisse).not.toBeNull()
  expect(ergebnisse!.angeboteText).toContain('Catering')
  expect(ergebnisse!.profilText).toContain('Sebastian Titz')
  expect(ergebnisse!.anfrageText).toContain('Musterkunde')
  expect(ergebnisse!.aktuellesText).toContain('Adanks Biofarm')
})

test('Startseite erzeugt auf Mobil- und Desktop-Viewport keinen horizontalen Überlauf', async ({
  page,
}) => {
  for (const viewport of [
    { width: 390, height: 844 }, // Mobile (iPhone-Grösse)
    { width: 1280, height: 800 }, // Desktop
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.waitForLoadState('load')

    const hatUeberlauf = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth
    })
    expect(hatUeberlauf).toBe(false)
  }
})
test('lexicalToHtml verwirft unsichere Protokolle und beschränkt Überschriften', () => {
  const doc = {
    root: {
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'link',
              fields: { url: 'javascript:alert(1)' },
              children: [{ type: 'text', text: 'Klick' }],
            },
            {
              type: 'link',
              url: 'https://titz.cooking/angebote/',
              children: [{ type: 'text', text: 'Gut' }],
            },
          ],
        },
        {
          type: 'heading',
          tag: 'script',
          children: [{ type: 'text', text: 'alert(1)' }],
        },
      ],
    },
  }

  const html = lexicalToHtml(doc)
  expect(html).not.toContain('javascript:')
  expect(html).not.toContain('<script>')
  expect(html).toContain('href="#"')
  expect(html).toContain('<h2>alert(1)</h2>')
})

test('hatLexicalInhalt unterscheidet echte Inhalte von leeren Paragraphen', () => {
  const leer = {
    root: {
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', text: '   ' }],
        },
      ],
    },
  }
  expect(hatLexicalInhalt(leer)).toBe(false)
})

test('hrefFor blockiert unsichere JavaScript-Links in der Navigation', () => {
  expect(
    hrefFor({
      label: 'Test',
      linkType: 'url',
      url: 'javascript:alert(1)',
    } as never),
  ).toBe('#')
})

test('schema.ts extrahiert Schweizer Preise sauber und setzt Zeitzonen-Offset', () => {
  const anlass = einAnlass(
    {
      id: 1,
      title: 'Gourmetabend',
      slug: 'gourmetabend',
      rhythmus: 'einmalig',
      datum: '2026-11-20',
      zeit: '18:00',
      excerpt: 'Test',
      preis: 'CHF 98.–',
      updatedAt: '',
      createdAt: '',
    },
    'https://titz.cooking',
  ) as { offers?: { price?: string; priceCurrency?: string }; startDate?: string }

  expect(anlass.offers?.price).toBe('98')
  expect(anlass.offers?.priceCurrency).toBe('CHF')
  expect(anlass.startDate).toBe('2026-11-20T18:00:00+01:00')
  expect(istKommenderAnlass({ rhythmus: 'einmalig', datum: 'ungueltig' })).toBe(false)
})
