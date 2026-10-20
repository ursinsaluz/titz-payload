/**
 * WebMCP-Integration (`navigator.modelContext` / `document.modelContext`).
 *
 * Stellt KI-Agenten im Browser strukturierte Werkzeuge für titz.cooking bereit,
 * statt sie das DOM ablesen zu lassen. Die Daten kommen erst beim ersten
 * Tool-Aufruf aus `/webmcp.json` (beim Astro-Build aus dem CMS erzeugt).
 *
 * Unterstützt sowohl `document.modelContext` (aktueller W3C-Entwurf) als auch
 * `navigator.modelContext` (frühe Chromium-Implementierung) sowie `registerTool`
 * und `provideContext`. Zusätzlich liegt dieselbe Schnittstelle unter
 * `window.titzWebMCP`, damit sich die Tools auch ohne Browser-Flag in DevTools
 * oder Smoke-Tests aufrufen lassen.
 */

interface WebMcpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: { readOnlyHint?: boolean }
  execute: (input: Record<string, unknown>) => Promise<{
    content: { type: 'text'; text: string }[]
  }>
}

interface ModelContextApi {
  registerTool?: (tool: WebMcpTool) => Promise<void> | void
  provideContext?: (options: { tools: WebMcpTool[] }) => Promise<void> | void
}

interface WebMcpIndex {
  person: Record<string, unknown>
  angebote: Record<string, unknown>[]
  anlaesse: Record<string, unknown>[]
  gerichte: Record<string, unknown>[]
  aktuelles: {
    slug: string
    eigenerBeitrag: boolean
    url: string | null
    title: string
    date: string
    badge: string | null
    excerpt: string
    inhalt: string | null
    weiterfuehrenderLink: string | null
  }[]
  stationen: {
    group: string
    period: string | null
    title: string
    place: string | null
    description: string | null
    highlights: string[]
  }[]
}

let indexPromise: Promise<WebMcpIndex> | null = null

function ladeIndex(): Promise<WebMcpIndex> {
  if (!indexPromise) {
    indexPromise = fetch('/webmcp.json').then((res) => {
      if (!res.ok) throw new Error(`webmcp.json: HTTP ${res.status}`)
      return res.json() as Promise<WebMcpIndex>
    })
  }
  return indexPromise
}

const alsAntwort = (daten: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(daten, null, 2) }],
})

const tools: WebMcpTool[] = [
  {
    name: 'angebote_und_anlaesse',
    description:
      'Liefert Angebote (Catering, Privatkoch, Gastroberatung samt Einsatzgebiet), kommende Anlässe im Restaurant PINOT (wöchentlicher Gourmetabend und Einzeltermine) sowie Signature Dishes von Sebastian Titz.',
    inputSchema: {
      type: 'object',
      properties: {
        bereich: {
          type: 'string',
          enum: ['alle', 'angebote', 'anlaesse', 'gerichte'],
          description: 'Optionaler Filter auf einen Teilbereich (Standard: alle).',
        },
      },
    },
    annotations: { readOnlyHint: true },
    execute: async ({ bereich = 'alle' }) => {
      const daten = await ladeIndex()
      if (bereich === 'angebote') return alsAntwort({ angebote: daten.angebote })
      if (bereich === 'anlaesse') return alsAntwort({ anlaesse: daten.anlaesse })
      if (bereich === 'gerichte') return alsAntwort({ gerichte: daten.gerichte })
      return alsAntwort({
        angebote: daten.angebote,
        anlaesse: daten.anlaesse,
        gerichte: daten.gerichte,
      })
    },
  },
  {
    name: 'aktuelles_und_artikel',
    description:
      'Durchsucht Beiträge und Presseberichte unter «Aktuelles» oder gibt den Volltext eines eigenen Artikels zurück (z.B. Fläscher Bio-Senf mit Adanks Biofarm oder Kräutertour ums Restaurant PINOT).',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'Slug eines Beitrags für den Abruf mit vollständigem Artikeltext.',
        },
        suche: {
          type: 'string',
          description: 'Optionaler Suchbegriff für Titel, Kurztext oder Artikelinhalt.',
        },
      },
    },
    annotations: { readOnlyHint: true },
    execute: async ({ slug, suche }) => {
      const { aktuelles } = await ladeIndex()
      if (typeof slug === 'string' && slug.trim()) {
        const treffer = aktuelles.find((e) => e.slug === slug.trim())
        return alsAntwort(treffer ?? { fehler: `Kein Beitrag mit Slug «${slug}» gefunden.` })
      }
      if (typeof suche === 'string' && suche.trim()) {
        const q = suche.trim().toLowerCase()
        const gefiltert = aktuelles.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.excerpt.toLowerCase().includes(q) ||
            (e.inhalt && e.inhalt.toLowerCase().includes(q)),
        )
        return alsAntwort({ treffer: gefiltert })
      }
      return alsAntwort({
        aktuelles: aktuelles.map(({ inhalt: _inhalt, ...rest }) => rest),
      })
    },
  },
  {
    name: 'profil_und_stationen',
    description:
      'Gibt das Kurzprofil, Auszeichnungen, Kontaktdaten und die beruflichen Stationen (Lebenslauf, Ausbildung, Kompetenzen, Hobbies) von Küchenchef Sebastian Titz zurück.',
    inputSchema: {
      type: 'object',
      properties: {
        gruppe: {
          type: 'string',
          enum: ['alle', 'stationen', 'ausbildung', 'skills', 'hobbies'],
          description: 'Optionaler Filter für den Lebenslauf.',
        },
      },
    },
    annotations: { readOnlyHint: true },
    execute: async ({ gruppe = 'alle' }) => {
      const { person, stationen } = await ladeIndex()
      const gefiltert = gruppe === 'alle' ? stationen : stationen.filter((s) => s.group === gruppe)
      return alsAntwort({ person, stationen: gefiltert })
    },
  },
  {
    name: 'anfrage_vorbereiten',
    description:
      'Bereitet eine strukturierte E-Mail-Anfrage (mailto:info@titz.cooking) für Catering/Privatkoch, Gastroberatung oder eine Tischreservation beim Gourmetabend im Restaurant PINOT vor.',
    inputSchema: {
      type: 'object',
      properties: {
        anliegen: {
          type: 'string',
          enum: ['catering', 'beratung', 'gourmetabend', 'allgemein'],
          description: 'Art der Anfrage.',
        },
        datum: {
          type: 'string',
          description: 'Gewünschtes Datum oder Zeitraum (optional).',
        },
        personen: {
          type: 'number',
          description: 'Ungefähre Gäste- oder Personenzahl (optional).',
        },
        ort: {
          type: 'string',
          description: 'Ort oder Region des Anlasses bzw. Betriebs (optional).',
        },
        nachricht: {
          type: 'string',
          description: 'Zusätzliche Angaben oder Fragen (optional).',
        },
        oeffnen: {
          type: 'boolean',
          description: 'Wenn true, wird der erzeugte mailto-Link direkt im Browser geöffnet.',
        },
      },
      required: ['anliegen'],
    },
    annotations: { readOnlyHint: false },
    execute: async ({ anliegen, datum, personen, ort, nachricht, oeffnen }) => {
      const betreffMap: Record<string, string> = {
        catering: 'Anfrage Catering / Privatkoch',
        beratung: 'Anfrage Gastroberatung',
        gourmetabend: 'Reservation Gourmetabend im PINOT',
        allgemein: 'Anfrage über titz.cooking',
      }
      const betreff = betreffMap[String(anliegen)] ?? betreffMap.allgemein
      const zeilen = ['Guten Tag Sebastian Titz', '']
      if (datum) zeilen.push(`Datum / Zeitraum: ${datum}`)
      if (personen) zeilen.push(`Personenzahl: ${personen}`)
      if (ort) zeilen.push(`Ort / Region: ${ort}`)
      if (nachricht) {
        zeilen.push('', String(nachricht))
      }
      zeilen.push('', 'Freundliche Grüsse')

      const mailto = `mailto:info@titz.cooking?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(zeilen.join('\n'))}`
      if (oeffnen === true) {
        window.location.href = mailto
      }
      return alsAntwort({
        empfaenger: 'info@titz.cooking',
        betreff,
        mailto,
        geoeffnet: Boolean(oeffnen),
      })
    },
  },
]

async function initWebMcp() {
  const api =
    (document as unknown as { modelContext?: ModelContextApi }).modelContext ??
    (navigator as unknown as { modelContext?: ModelContextApi }).modelContext

  if (api?.registerTool) {
    for (const tool of tools) {
      await api.registerTool(tool)
    }
  } else if (api?.provideContext) {
    await api.provideContext({ tools })
  }

  ;(window as unknown as { titzWebMCP?: unknown }).titzWebMCP = {
    tools: tools.map(({ name, description, inputSchema, annotations }) => ({
      name,
      description,
      inputSchema,
      annotations,
    })),
    callTool: async (name: string, input: Record<string, unknown> = {}) => {
      const tool = tools.find((t) => t.name === name)
      if (!tool) throw new Error(`Unbekanntes WebMCP-Tool: ${name}`)
      return tool.execute(input)
    },
  }
}

void initWebMcp()
