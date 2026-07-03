import type { GlobalConfig } from 'payload'
import { iconSelect } from '../fields/iconSelect'
import { linkFields } from '../fields/link'

export const Header: GlobalConfig = {
  slug: 'header',
  label: 'Header & Stage',
  admin: { group: 'Struktur' },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'logo',
      type: 'group',
      label: 'Logo',
      fields: [
        { name: 'text', type: 'text', label: 'Logo-Text', defaultValue: 'Sebastian Titz' },
        { name: 'image', type: 'upload', relationTo: 'media', label: 'Logo-Bild (optional)' },
      ],
    },
    {
      name: 'nav',
      type: 'array',
      label: 'Navigation',
      fields: linkFields,
    },
    {
      name: 'cta',
      type: 'group',
      label: 'Header-CTA',
      fields: [
        { name: 'label', type: 'text', label: 'Bezeichnung' },
        { name: 'url', type: 'text', label: 'URL / Anker' },
        iconSelect(),
      ],
    },
    {
      name: 'stage',
      type: 'group',
      label: 'Stage / Hero',
      fields: [
        { name: 'eyebrow', type: 'text', label: 'Eyebrow / Überzeile' },
        { name: 'headline', type: 'text', label: 'Headline', required: true },
        { name: 'subline', type: 'textarea', label: 'Subline' },
        {
          name: 'badges',
          type: 'array',
          label: 'Badges (z.B. Michelin-Stern, GaultMillau)',
          fields: [
            iconSelect(),
            { name: 'label', type: 'text', label: 'Text', required: true },
          ],
        },
        { name: 'image', type: 'upload', relationTo: 'media', label: 'Hintergrundbild / Poster' },
        { name: 'videoUrl', type: 'text', label: 'Hintergrund-Video-URL (optional)' },
        {
          name: 'primaryCta',
          type: 'group',
          label: 'Primärer CTA',
          fields: [
            { name: 'label', type: 'text', label: 'Bezeichnung' },
            { name: 'url', type: 'text', label: 'URL / Anker' },
          ],
        },
        {
          name: 'secondaryCta',
          type: 'group',
          label: 'Sekundärer CTA',
          fields: [
            { name: 'label', type: 'text', label: 'Bezeichnung' },
            { name: 'url', type: 'text', label: 'URL / Anker' },
          ],
        },
        { name: 'scrollHint', type: 'text', label: 'Scroll-Hinweis' },
      ],
    },
  ],
}
