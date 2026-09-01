import { describe, expect, it } from 'vitest'
import type { PayloadRequest } from 'payload'

import { mediaLesen } from '../../src/collections/mediaZugriff'
import { Media } from '../../src/collections/Media'

/**
 * Die Regel entscheidet, ob private Aufnahmen öffentlich sind. Ein Tippfehler im
 * Feldnamen oder ein umbenannter Optionswert würde sie stillschweigend
 * unwirksam machen — die Abfrage liefe weiter, nur ohne Bedingung. Darum wird
 * hier auch gegen die Feldkonfiguration geprüft und nicht nur gegen sich selbst.
 */

const anfrage = (user: unknown) => ({ user }) as unknown as PayloadRequest

/** Die Optionswerte aus der Collection, damit der Test bei einer Umbenennung bricht. */
const verwendungsWerte = (() => {
  const felder = Media.fields as {
    type: string
    fields?: { name?: string; options?: { value: string }[] }[]
  }[]
  for (const feld of felder) {
    for (const unterfeld of feld.fields ?? []) {
      if (unterfeld.name === 'verwendung') {
        return (unterfeld.options ?? []).map((o) => o.value)
      }
    }
  }
  return []
})()

describe('mediaLesen', () => {
  it('gibt Angemeldeten alles frei', () => {
    expect(mediaLesen({ req: anfrage({ id: 1 }) } as never)).toBe(true)
  })

  it('schränkt Nicht-Angemeldete auf eine Bedingung ein, statt alles freizugeben', () => {
    const ergebnis = mediaLesen({ req: anfrage(undefined) } as never)
    expect(ergebnis, 'true hier hiesse: private Bilder sind öffentlich').not.toBe(true)
    expect(ergebnis).toEqual({ verwendung: { not_in: ['intern', 'archiv'] } })
  })

  it('schliesst genau die nicht-öffentlichen Optionen aus, die es im Feld gibt', () => {
    // Bricht, wenn im Feld eine vierte Verwendung dazukommt: Dann muss jemand
    // entscheiden, ob sie öffentlich ist.
    expect(verwendungsWerte.sort()).toEqual(['archiv', 'intern', 'web'])

    const ergebnis = mediaLesen({ req: anfrage(undefined) } as never) as {
      verwendung: { not_in: string[] }
    }
    const ausgeschlossen = ergebnis.verwendung.not_in
    expect(ausgeschlossen.every((wert) => verwendungsWerte.includes(wert))).toBe(true)
    expect(ausgeschlossen).not.toContain('web')
  })

  it('ist in der Collection verdrahtet', () => {
    expect(Media.access?.read).toBe(mediaLesen)
  })
})
