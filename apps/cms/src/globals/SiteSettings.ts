import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site & SEO',
  admin: { group: 'Struktur' },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'siteName', type: 'text', label: 'Site-Name', required: true, defaultValue: 'Sebastian Titz' },
    { name: 'domain', type: 'text', label: 'Domain', defaultValue: 'https://titz.cooking' },
    {
      name: 'defaultSeo',
      type: 'group',
      label: 'SEO-Standardwerte',
      fields: [
        { name: 'title', type: 'text', label: 'Standard-Titel' },
        { name: 'titleTemplate', type: 'text', label: 'Titel-Vorlage', admin: { description: 'z.B. «%s | Sebastian Titz»' } },
        { name: 'description', type: 'textarea', label: 'Standard-Beschreibung' },
        { name: 'image', type: 'upload', relationTo: 'media', label: 'Standard-OG-Bild' },
      ],
    },
    {
      name: 'easterEggs',
      type: 'group',
      label: 'Easter Eggs',
      fields: [
        {
          name: 'completionToast',
          type: 'textarea',
          label: 'Abschluss-Toast (alle Zutaten entdeckt)',
        },
        { name: 'starToast', type: 'textarea', label: 'Stern-Toast (✦)' },
      ],
    },
  ],
}
