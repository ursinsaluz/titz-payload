import type { CollectionConfig } from 'payload'
import { iconSelect } from '../fields/iconSelect'
import { reihenfolge } from '../fields/reihenfolge'

export const Stationen: CollectionConfig = {
  slug: 'stationen',
  labels: { singular: 'Station', plural: 'Stationen (Lebenslauf)' },
  admin: {
    useAsTitle: 'title',
    // `group` teilt diese Collection in vier Listen — Stationen, Ausbildung,
    // Qualifikationen, Hobbies. Ohne die Spalte war in der Übersicht nicht zu
    // sehen, zu welcher ein Eintrag gehört; von 15 Dokumenten sind nur 5
    // wirkliche Stationen.
    defaultColumns: ['group', 'period', 'title', 'place', 'order'],
    group: 'Inhalt',
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
    {
      name: 'period',
      type: 'text',
      label: 'Zeitraum',
      admin: { description: 'z.B. «2019 – 2023»' },
    },
    { name: 'title', type: 'text', label: 'Station / Position', required: true },
    { name: 'place', type: 'text', label: 'Ort / Betrieb' },
    { name: 'description', type: 'textarea', label: 'Beschreibung' },
    iconSelect(),
    {
      name: 'highlights',
      type: 'array',
      label: 'Auszeichnungen / Highlights',
      fields: [iconSelect(), { name: 'text', type: 'text', label: 'Text', required: true }],
    },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Bild' },
    reihenfolge('stationen'),
  ],
}
