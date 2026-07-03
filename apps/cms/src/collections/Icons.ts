import type { CollectionConfig } from 'payload'

/**
 * SVG-Icon-Bibliothek. Jedes Icon ist ein Asset (SVG-Upload) und wird von
 * anderen Elementen per Relationship-Dropdown referenziert.
 */
export const Icons: CollectionConfig = {
  slug: 'icons',
  labels: { singular: 'Icon', plural: 'Icons' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'filename'],
    group: 'Assets',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Name',
      required: true,
      unique: true,
      admin: { description: 'Eindeutiger Name, z.B. «map-pin» oder «instagram»' },
    },
    {
      name: 'svg',
      type: 'textarea',
      label: 'SVG-Quellcode',
      admin: {
        description:
          'Inline-SVG für das Frontend (nutzt currentColor). Wird beim Seed aus der Datei übernommen.',
      },
    },
    {
      name: 'toasts',
      type: 'array',
      label: 'Toast-Sprüche (Easter Egg)',
      admin: {
        description:
          'Sprüche, die beim Anklicken des Icons erscheinen. Icons mit Sprüchen zählen als entdeckbare «Zutat». Mehrere Sprüche wechseln sich bei wiederholtem Klick ab.',
      },
      fields: [{ name: 'text', type: 'textarea', label: 'Spruch', required: true }],
    },
  ],
  upload: {
    mimeTypes: ['image/svg+xml'],
    crop: false,
    focalPoint: false,
  },
}
