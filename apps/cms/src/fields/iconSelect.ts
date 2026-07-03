import type { Field } from 'payload'

/** Referenzierbare Icon-Auswahl (Dropdown) auf die Icons-Collection. */
export const iconSelect = (overrides: Partial<Field> = {}): Field =>
  ({
    name: 'icon',
    type: 'relationship',
    relationTo: 'icons',
    label: 'Icon',
    ...overrides,
  }) as Field
