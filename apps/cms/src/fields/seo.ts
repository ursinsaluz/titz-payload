import type { Field } from 'payload'

export const seoFields: Field = {
  name: 'seo',
  type: 'group',
  label: 'SEO',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Meta-Titel',
      admin: { description: 'Leer lassen für Standard aus Site-Einstellungen' },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Meta-Beschreibung',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Open-Graph-Bild',
    },
    {
      name: 'noIndex',
      type: 'checkbox',
      label: 'Von Suchmaschinen ausschliessen',
      defaultValue: false,
    },
  ],
}
