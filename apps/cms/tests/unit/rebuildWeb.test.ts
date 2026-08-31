import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CollectionConfig, GlobalConfig, Payload } from 'payload'

import {
  GLOBALS_MIT_REBUILD,
  SAMMLUNGEN_MIT_REBUILD,
  SAMMLUNGEN_OHNE_REBUILD,
  mitRebuild,
  rebuildWeb,
} from '../../src/hooks/rebuildWeb'

import { Users } from '../../src/collections/Users'
import { Media } from '../../src/collections/Media'
import { Icons } from '../../src/collections/Icons'
import { Pages } from '../../src/collections/Pages'
import { News } from '../../src/collections/News'
import { Angebote } from '../../src/collections/Angebote'
import { SignatureDishes } from '../../src/collections/SignatureDishes'
import { Stationen } from '../../src/collections/Stationen'
import { Header } from '../../src/globals/Header'
import { Footer } from '../../src/globals/Footer'
import { SiteSettings } from '../../src/globals/SiteSettings'

/**
 * Bewusst keine Datenbank und kein Payload-Bootstrap: Der Hook ist reine Logik —
 * Sperre, Entwurfsprüfung, Listenzuordnung. Der Vorgänger dieses Tests startete
 * eine ganze Payload-Instanz, um `expect(users).toBeDefined()` zu prüfen.
 */

const ALLE_SAMMLUNGEN = [Users, Media, Icons, Pages, News, Angebote, SignatureDishes, Stationen]
const ALLE_GLOBALS = [Header, Footer, SiteSettings]

const logger = () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })
const fakePayload = () => ({ logger: logger() }) as unknown as Payload

describe('Listenzuordnung', () => {
  it('ordnet jede Sammlung der Konfiguration genau einer Liste zu', () => {
    const mit = new Set<string>(SAMMLUNGEN_MIT_REBUILD)
    const ohne = new Set<string>(SAMMLUNGEN_OHNE_REBUILD)

    for (const sammlung of ALLE_SAMMLUNGEN) {
      const inMit = mit.has(sammlung.slug)
      const inOhne = ohne.has(sammlung.slug)
      expect(
        inMit !== inOhne,
        `«${sammlung.slug}» steht in ${inMit && inOhne ? 'beiden Listen' : 'keiner Liste'} — ` +
          `entscheide, ob eine Änderung daran die Seite verändert`,
      ).toBe(true)
    }
  })

  it('führt keine Slugs, die es nicht mehr gibt', () => {
    const vorhanden = new Set(ALLE_SAMMLUNGEN.map((s) => s.slug))
    for (const slug of [...SAMMLUNGEN_MIT_REBUILD, ...SAMMLUNGEN_OHNE_REBUILD]) {
      expect(vorhanden.has(slug), `«${slug}» ist gelistet, aber keine Sammlung mehr`).toBe(true)
    }
  })

  it('deckt alle Globals ab', () => {
    expect([...GLOBALS_MIT_REBUILD].sort()).toEqual(ALLE_GLOBALS.map((g) => g.slug).sort())
  })
})

describe('mitRebuild', () => {
  it('hängt afterChange und afterDelete an eine sichtbare Sammlung', () => {
    const ergebnis = mitRebuild(Pages)
    expect(ergebnis.hooks?.afterChange).toHaveLength(1)
    expect(ergebnis.hooks?.afterDelete).toHaveLength(1)
  })

  it('lässt eine unsichtbare Sammlung unverändert', () => {
    expect(mitRebuild(Users)).toBe(Users)
  })

  it('hängt an ein Global nur afterChange — Globals kennen kein Löschen', () => {
    const ergebnis = mitRebuild(Header)
    expect(ergebnis.hooks?.afterChange).toHaveLength(1)
    expect((ergebnis as GlobalConfig).hooks).not.toHaveProperty('afterDelete')
  })

  it('verdrängt bestehende Hooks nicht, sondern läuft danach', () => {
    const vorhandener = vi.fn()
    const mitEigenemHook: CollectionConfig = {
      ...Pages,
      hooks: { afterChange: [vorhandener] },
    }
    const ergebnis = mitRebuild(mitEigenemHook)
    expect(ergebnis.hooks?.afterChange).toHaveLength(2)
    expect(ergebnis.hooks?.afterChange?.[0]).toBe(vorhandener)
  })

  it('gibt eine neue Konfiguration zurück, statt die Vorlage zu verändern', () => {
    const vorher = Pages.hooks?.afterChange?.length ?? 0
    mitRebuild(Pages)
    expect(Pages.hooks?.afterChange?.length ?? 0).toBe(vorher)
  })
})

describe('rebuildWeb', () => {
  const HOOK = 'https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/test'
  let fetchSpy: ReturnType<typeof vi.fn>

  /**
   * Die Sperre in `rebuildWeb` ist Modulzustand und lebt über Tests hinweg
   * weiter — genau wie im Worker über Anfragen hinweg. Jeder Test startet
   * darum eine Minute später als der vorige, damit er nicht in die Sperre des
   * vorigen läuft.
   */
  let jetzt = Date.parse('2026-08-31T12:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    jetzt += 60_000
    vi.setSystemTime(new Date(jetzt))
    fetchSpy = vi.fn(async () => new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)
    process.env.WEB_DEPLOY_HOOK_URL = HOOK
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete process.env.WEB_DEPLOY_HOOK_URL
  })

  it('tut ohne Hook-URL nichts und meldet das leise', async () => {
    delete process.env.WEB_DEPLOY_HOOK_URL
    await expect(rebuildWeb(fakePayload())).resolves.toBe('nicht-konfiguriert')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('stösst einen Build an', async () => {
    await expect(rebuildWeb(fakePayload())).resolves.toBe('ausgeloest')
    expect(fetchSpy).toHaveBeenCalledWith(HOOK, { method: 'POST' })
  })

  it('schluckt einen zweiten Aufruf innerhalb der Sperre', async () => {
    await rebuildWeb(fakePayload())
    vi.setSystemTime(new Date(jetzt + 1000))
    await expect(rebuildWeb(fakePayload())).resolves.toBe('uebersprungen')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('lässt nach Ablauf der Sperre wieder durch', async () => {
    await rebuildWeb(fakePayload())
    vi.setSystemTime(new Date(jetzt + 6000))
    await expect(rebuildWeb(fakePayload())).resolves.toBe('ausgeloest')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('nimmt die Sperre nach einem Fehlschlag zurück, sonst bliebe die Änderung unsichtbar', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('nope', { status: 500 }))
    const payload = fakePayload()
    await expect(rebuildWeb(payload)).resolves.toBe('fehler')
    expect(payload.logger.error).toHaveBeenCalled()

    // Ohne Zurücknehmen wäre der nächste Versuch «uebersprungen».
    await expect(rebuildWeb(fakePayload())).resolves.toBe('ausgeloest')
  })

  it('behandelt einen Netzwerkfehler wie einen Fehlschlag', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const payload = fakePayload()
    await expect(rebuildWeb(payload)).resolves.toBe('fehler')
    expect(payload.logger.error).toHaveBeenCalled()
  })
})
