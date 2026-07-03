import type { CollectionConfig } from 'payload'
import { iconSelect } from '../fields/iconSelect'

export const SignatureDishes: CollectionConfig = {
  slug: 'signature-dishes',
  labels: { singular: 'Signature Dish', plural: 'Signature Dishes' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'order'],
    group: 'Inhalte',
  },
  access: {
    read: () => true,
  },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', label: 'Name', required: true },
    { name: 'tag', type: 'text', label: 'Tag (z.B. «Signature», «Starter»)' },
    iconSelect(),
    { name: 'description', type: 'textarea', label: 'Beschreibung' },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Bild' },
    { name: 'videoUrl', type: 'text', label: 'Video-URL (YouTube)' },
    { name: 'order', type: 'number', label: 'Reihenfolge', defaultValue: 0 },
  ],
}
