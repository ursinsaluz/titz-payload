import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { slugFeld, slugify } from '../../src/fields/slugFeld'

const baueReq = (vorhandeneSlugs: Array<{ id: number; slug: string }>) => {
  const find = vi.fn(
    async ({ where }: { where: { slug?: { like?: string; equals?: string } } }) => {
      const like = where.slug?.like
      const equals = where.slug?.equals
      if (like) {
        const praefix = like.replace(/%$/, '')
        return { docs: vorhandeneSlugs.filter((d) => d.slug.startsWith(praefix)) }
      }
      if (equals) {
        return { docs: vorhandeneSlugs.filter((d) => d.slug === equals) }
      }
      return { docs: [] }
    },
  )
  return { req: { payload: { find } } as unknown as PayloadRequest, find }
}

describe('slugify', () => {
  it('schreibt Umlaute und ß aus und entfernt Akzente', () => {
    expect(slugify('Kräutertour & Fläscher Café — Maßstab')).toBe(
      'kraeutertour-flaescher-cafe-massstab',
    )
  })
})

describe('slugFeld beforeValidate Hook', () => {
  const holeHook = () => {
    const feld = slugFeld('events')
    const hook = feld.hooks?.beforeValidate?.[0]
    if (!hook) throw new Error('beforeValidate Hook fehlt')
    return hook
  }

  it('ermittelt freien Kollisions-Slug mit einer einzigen Datenbankabfrage statt N Einzelabfragen', async () => {
    const hook = holeHook()
    const { req, find } = baueReq([
      { id: 1, slug: 'gourmetabend' },
      { id: 2, slug: 'gourmetabend-2' },
      { id: 3, slug: 'gourmetabend-3' },
    ])

    const ergebnis = await hook({
      data: { title: 'Gourmetabend' },
      operation: 'create',
      originalDoc: undefined,
      req,
      value: undefined,
    } as never)

    expect(ergebnis).toBe('gourmetabend-4')
    expect(find).toHaveBeenCalledTimes(1)
  })

  it('prüft auch einen manuell gesetzten Slug auf Eindeutigkeit gegen fremde Datensätze', async () => {
    const hook = holeHook()
    const { req } = baueReq([{ id: 10, slug: 'catering' }])

    const ergebnis = await hook({
      data: { title: 'Catering Event' },
      operation: 'create',
      originalDoc: undefined,
      req,
      value: 'Catering',
    } as never)

    expect(ergebnis).toBe('catering-2')
  })

  it('behält beim Update den eigenen manuell gesetzten Slug ohne -2 anzuhängen', async () => {
    const hook = holeHook()
    const { req } = baueReq([{ id: 10, slug: 'catering' }])

    const ergebnis = await hook({
      data: { title: 'Catering Event' },
      operation: 'update',
      originalDoc: { id: 10, slug: 'catering' },
      req,
      value: 'catering',
    } as never)

    expect(ergebnis).toBe('catering')
  })
})
