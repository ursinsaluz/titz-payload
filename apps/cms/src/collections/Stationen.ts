import type { CollectionConfig } from 'payload'
import { iconSelect } from '../fields/iconSelect'

export const Stationen: CollectionConfig = {
  slug: 'stationen',
  labels: { singular: 'Station', plural: 'Stationen (Lebenslauf)' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['period', 'title', 'place', 'order'],
    group: 'Inhalte',
  },
  access: {
    read: () => true,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'group',
      type: 'select',
      label: 'Gruppe',
      required: true,
      defaultValue: 'stationen',
      options: [
        { label: 'Meine Stationen', value: 'stationen' },
        { label: 'Aus- und Weiterbildung', value: 'ausbildung' },
        { label: 'Besondere Qualifikationen & Projekte', value: 'qualifikationen' },
        { label: 'Hobbies & Interessen', value: 'hobbies' },
      ],
    },
    { name: 'period', type: 'text', label: 'Zeitraum', admin: { description: 'z.B. «2019 – 2023»' } },
    { name: 'title', type: 'text', label: 'Station / Position', required: true },
    { name: 'place', type: 'text', label: 'Ort / Betrieb' },
    { name: 'description', type: 'textarea', label: 'Beschreibung' },
    iconSelect(),
    {
      name: 'highlights',
      type: 'array',
      label: 'Auszeichnungen / Highlights',
      fields: [
        iconSelect(),
        { name: 'text', type: 'text', label: 'Text', required: true },
      ],
    },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Bild' },
    { name: 'order', type: 'number', label: 'Reihenfolge', defaultValue: 0 },
  ],
}
