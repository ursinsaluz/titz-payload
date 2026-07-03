import type { Field } from 'payload'

/** Link auf Sektions-Anker, interne Seite oder externe URL. */
export const linkFields: Field[] = [
  {
    name: 'label',
    type: 'text',
    label: 'Bezeichnung',
    required: true,
  },
  {
    name: 'linkType',
    type: 'radio',
    label: 'Link-Typ',
    defaultValue: 'anchor',
    options: [
      { label: 'Sektion (Anker)', value: 'anchor' },
      { label: 'Seite', value: 'page' },
      { label: 'Externe URL', value: 'url' },
    ],
  },
  {
    name: 'anchor',
    type: 'text',
    label: 'Anker (z.B. philosophie)',
    admin: { condition: (_, siblingData) => siblingData?.linkType === 'anchor' },
  },
  {
    name: 'page',
    type: 'relationship',
    relationTo: 'pages',
    label: 'Seite',
    admin: { condition: (_, siblingData) => siblingData?.linkType === 'page' },
  },
  {
    name: 'url',
    type: 'text',
    label: 'URL',
    admin: { condition: (_, siblingData) => siblingData?.linkType === 'url' },
  },
  {
    name: 'newTab',
    type: 'checkbox',
    label: 'In neuem Tab öffnen',
    defaultValue: false,
  },
]
