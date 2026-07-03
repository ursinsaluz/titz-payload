import type { CollectionConfig } from 'payload'

export const News: CollectionConfig = {
  slug: 'news',
  labels: { singular: 'News-Eintrag', plural: 'Aktuelles' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', '_status'],
    group: 'Inhalte',
  },
  access: {
    read: () => true,
  },
  versions: { drafts: true },
  defaultSort: '-date',
  fields: [
    { name: 'title', type: 'text', label: 'Titel', required: true },
    { name: 'date', type: 'date', label: 'Datum', required: true },
    { name: 'badge', type: 'text', label: 'Badge (z.B. «Neu», «Event»)' },
    { name: 'excerpt', type: 'textarea', label: 'Kurztext', required: true },
    { name: 'body', type: 'richText', label: 'Inhalt' },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Bild' },
    {
      name: 'link',
      type: 'group',
      label: 'Weiterführender Link',
      fields: [
        { name: 'label', type: 'text', label: 'Bezeichnung' },
        { name: 'url', type: 'text', label: 'URL' },
      ],
    },
  ],
}
