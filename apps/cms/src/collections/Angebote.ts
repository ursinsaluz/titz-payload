import type { CollectionConfig } from 'payload'
import { iconSelect } from '../fields/iconSelect'

export const Angebote: CollectionConfig = {
  slug: 'angebote',
  labels: { singular: 'Angebot', plural: 'Angebote' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'order'],
    group: 'Inhalte',
  },
  access: {
    read: () => true,
  },
  defaultSort: 'order',
  fields: [
    { name: 'title', type: 'text', label: 'Titel', required: true },
    { name: 'eyebrow', type: 'text', label: 'Eyebrow / Überzeile' },
    iconSelect({ admin: { description: 'Icon für Karten-/Tab-Darstellung' } }),
    { name: 'description', type: 'richText', label: 'Beschreibung' },
    {
      name: 'features',
      type: 'array',
      label: 'Leistungen / Merkmale',
      fields: [
        iconSelect(),
        { name: 'text', type: 'text', label: 'Text', required: true },
      ],
    },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Bild' },
    {
      name: 'cta',
      type: 'group',
      label: 'Call-to-Action',
      fields: [
        { name: 'label', type: 'text', label: 'Bezeichnung' },
        { name: 'url', type: 'text', label: 'URL' },
      ],
    },
    { name: 'order', type: 'number', label: 'Reihenfolge', defaultValue: 0 },
  ],
}
