import type { Page } from '@titz/types'

/**
 * Die Sektions-Blöcke einer Seite, aus dem generierten Content-Modell
 * herausgezogen.
 *
 * Payload erzeugt `Page['sections']` als Union anonymer Objekttypen, die über
 * `blockType` unterschieden sind — an einen einzelnen Block kommt man von aussen
 * darum nur per `Extract`. Vorher hatte jede Sektionskomponente ihre eigene
 * Handdeklaration, und die wich ab: durchgehend `string | undefined`, wo Payload
 * `string | null | undefined` liefert. Ein umbenanntes Feld fiel damit nirgends
 * auf.
 */
type Section = NonNullable<Page['sections']>[number]

export type Block<T extends Section['blockType']> = Extract<Section, { blockType: T }>
