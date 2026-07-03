import type { GlobalConfig } from 'payload'
import { linkFields } from '../fields/link'

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'Footer',
  admin: { group: 'Struktur' },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'about', type: 'textarea', label: 'Kurzbeschreibung' },
    {
      name: 'contact',
      type: 'group',
      label: 'Kontakt',
      fields: [
        { name: 'address', type: 'textarea', label: 'Adresse' },
        { name: 'phone', type: 'text', label: 'Telefon' },
        { name: 'email', type: 'text', label: 'E-Mail' },
      ],
    },
    {
      name: 'columns',
      type: 'array',
      label: 'Link-Spalten',
      fields: [
        { name: 'title', type: 'text', label: 'Spalten-Titel', required: true },
        { name: 'links', type: 'array', label: 'Links', fields: linkFields },
      ],
    },
    {
      name: 'socials',
      type: 'array',
      label: 'Social Links',
      fields: [
        { name: 'icon', type: 'upload', relationTo: 'media', label: 'Icon (optional)' },
        { name: 'label', type: 'text', label: 'Bezeichnung', required: true },
        { name: 'url', type: 'text', label: 'URL', required: true },
      ],
    },
    {
      name: 'legalLinks',
      type: 'array',
      label: 'Rechtliches (Impressum, Datenschutz)',
      fields: linkFields,
    },
    { name: 'copyright', type: 'text', label: 'Copyright-Zeile' },
  ],
}
