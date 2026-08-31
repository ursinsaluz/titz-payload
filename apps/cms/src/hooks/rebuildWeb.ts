import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
  GlobalAfterChangeHook,
  GlobalConfig,
  Payload,
} from 'payload'
import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * Das Frontend neu bauen lassen, sobald sich Inhalt ändert.
 *
 * `apps/web` ist ein statischer Astro-Build: Der Content wird einmal beim Build
 * aus der Payload-REST-API geholt und danach als fertiges HTML von Workers
 * Assets ausgeliefert. Ein Speichern im Admin änderte darum bisher gar nichts
 * an titz.cooking — es brauchte einen Git-Push oder ein `pnpm deploy:web`.
 *
 * Statt das Frontend deswegen auf SSR umzustellen (was jede Anfrage durch einen
 * Worker schicken würde, für drei Seiten ein schlechter Tausch), stösst dieser
 * Hook den Deploy-Hook von Workers Builds an. Ergebnis: speichern → in etwa
 * einer Minute ist die Änderung live, und die Seite bleibt statisch.
 *
 * Einrichtung: Cloudflare-Dashboard → Worker `titz-payload-web` → Settings →
 * Builds → Deploy Hooks. Die entstandene URL als Secret `WEB_DEPLOY_HOOK_URL`
 * auf dem Worker `titz-payload-admin` hinterlegen:
 *
 *   wrangler secret put WEB_DEPLOY_HOOK_URL
 *
 * Die URL ist selbst das Geheimnis — sie braucht kein Token, wer sie kennt kann
 * Builds auslösen. Darum gehört sie in ein Secret und nicht in `vars`.
 */

/**
 * Ein Speichern löst mehrere Hooks kurz hintereinander aus, und der Seed
 * schreibt Dutzende Datensätze am Stück — ohne Sperre würde das für jeden
 * einzelnen einen Build anstossen. Fünf Sekunden, weil ein Build ohnehin
 * ungefähr eine Minute läuft und alles in dieser Spanne denselben Stand baut.
 *
 * Die Sperre gilt nur je Isolate. Zwei Redaktionsanfragen können in
 * verschiedenen Isolates landen und dann zwei Builds auslösen; Workers Builds
 * verwirft den überholten selbst.
 */
const SPERRE_MS = 5000
let letzterLauf = 0

type Ergebnis = 'ausgeloest' | 'uebersprungen' | 'nicht-konfiguriert' | 'fehler'

export async function rebuildWeb(payload: Payload): Promise<Ergebnis> {
  const url = process.env.WEB_DEPLOY_HOOK_URL

  // Ohne Hook-URL passiert nichts, und zwar leise: In der Entwicklung wäre eine
  // Warnung bei jedem Speichern nur Lärm.
  if (!url) return 'nicht-konfiguriert'

  const jetzt = Date.now()
  if (jetzt - letzterLauf < SPERRE_MS) return 'uebersprungen'
  letzterLauf = jetzt

  try {
    const antwort = await fetch(url, { method: 'POST' })
    if (!antwort.ok) {
      // Beim Fehlschlag die Sperre zurücknehmen, sonst schluckt sie den nächsten
      // Versuch mit und die Änderung bliebe unsichtbar.
      letzterLauf = 0
      const text = (await antwort.text()).slice(0, 300)
      payload.logger.error(`[REBUILD] Deploy-Hook fehlgeschlagen (${antwort.status}): ${text}`)
      return 'fehler'
    }
    payload.logger.info('[REBUILD] Frontend-Build angestossen')
    return 'ausgeloest'
  } catch (fehler) {
    letzterLauf = 0
    payload.logger.error(`[REBUILD] Deploy-Hook fehlgeschlagen: ${fehler}`)
    return 'fehler'
  }
}

/**
 * Anstossen, ohne die Antwort im Admin aufzuhalten.
 *
 * Nicht einfach den Aufruf ohne `await` stehen lassen: Ein Worker darf
 * abgebrochen werden, sobald er geantwortet hat, und die offene Anfrage stirbt
 * dann mit ihm — mal ja, mal nein, je nach Auslastung. `waitUntil` hält ihn am
 * Leben, bis der POST durch ist. Der Kontext wird je Anfrage geholt; der beim
 * Laden des Moduls gespeicherte gehört zur allerersten und ist längst beendet.
 */
function rebuildImHintergrund(payload: Payload): void {
  void (async () => {
    try {
      const kontext = await getCloudflareContext({ async: true })
      if (kontext?.ctx && typeof kontext.ctx.waitUntil === 'function') {
        kontext.ctx.waitUntil(rebuildWeb(payload))
        return
      }
    } catch {
      // Kein Anfragekontext — CLI oder Seed. Dort ist Warten gratis.
    }
    await rebuildWeb(payload)
  })()
}

/**
 * Ein Entwurf ändert nichts an der veröffentlichten Seite: `pages` und `news`
 * haben Drafts, und Payload feuert `afterChange` auch beim Zwischenspeichern.
 * Ohne diese Prüfung würde jeder Tippstand einen Build auslösen.
 */
const istEntwurf = (doc: unknown): boolean =>
  typeof doc === 'object' && doc !== null && (doc as { _status?: string })._status === 'draft'

const rebuildNachAenderung: CollectionAfterChangeHook = ({ doc, req }) => {
  if (!istEntwurf(doc)) rebuildImHintergrund(req.payload)
  return doc
}

const rebuildNachLoeschen: CollectionAfterDeleteHook = ({ doc, req }) => {
  rebuildImHintergrund(req.payload)
  return doc
}

const rebuildNachGlobalAenderung: GlobalAfterChangeHook = ({ doc, req }) => {
  rebuildImHintergrund(req.payload)
  return doc
}

/**
 * Was auf titz.cooking sichtbar ist — und was nicht.
 *
 * Zwei Listen statt einer, weil beide Fehler etwas kosten: Eine vergessene
 * Sammlung bliebe stumm veraltet, eine zu viel würde im Dauertakt Builds
 * auslösen. `tests/unit/rebuildWeb.test.ts` prüft, dass jede Sammlung der
 * Konfiguration in genau einer der Listen steht — eine neue Sammlung bricht den
 * Test, bis jemand entschieden hat, wohin sie gehört.
 *
 * Die Collections des MCP-Plugins (`payload-mcp-api-keys`) und die technischen
 * `payload-*`-Sammlungen kommen nie durch `mitRebuild`: Sie stehen nicht im
 * `collections`-Array der Konfiguration. Das ist gut so — `payload-preferences`
 * ändert sich schon, wenn jemand im Admin eine Liste scrollt.
 */
export const SAMMLUNGEN_MIT_REBUILD = [
  'pages',
  'news',
  'angebote',
  'signature-dishes',
  'stationen',
  'icons',
  'media',
] as const

export const SAMMLUNGEN_OHNE_REBUILD = [
  'users', // nur Admin, kommt auf der Seite nie vor
] as const

/** Kopf- und Fusszeile stehen auf jeder Seite, die Einstellungen ebenso. */
export const GLOBALS_MIT_REBUILD = ['header', 'footer', 'site-settings'] as const

const MIT_REBUILD: ReadonlySet<string> = new Set<string>([
  ...SAMMLUNGEN_MIT_REBUILD,
  ...GLOBALS_MIT_REBUILD,
])

const GLOBALS: ReadonlySet<string> = new Set<string>(GLOBALS_MIT_REBUILD)

/**
 * Hängt die Rebuild-Hooks an, wenn der Inhalt auf der Seite landet — sonst gibt
 * sie die Konfiguration unverändert zurück. Bestehende Hooks bleiben erhalten
 * und laufen zuerst.
 */
export function mitRebuild<T extends CollectionConfig | GlobalConfig>(config: T): T {
  if (!MIT_REBUILD.has(config.slug)) return config

  // Globals kennen kein Löschen, darum nur der eine Hook — und der hat eine
  // eigene Signatur.
  if (GLOBALS.has(config.slug)) {
    const global = config as GlobalConfig
    return {
      ...global,
      hooks: {
        ...global.hooks,
        afterChange: [...(global.hooks?.afterChange ?? []), rebuildNachGlobalAenderung],
      },
    } as T
  }

  const collection = config as CollectionConfig
  return {
    ...collection,
    hooks: {
      ...collection.hooks,
      afterChange: [...(collection.hooks?.afterChange ?? []), rebuildNachAenderung],
      afterDelete: [...(collection.hooks?.afterDelete ?? []), rebuildNachLoeschen],
    },
  } as T
}
