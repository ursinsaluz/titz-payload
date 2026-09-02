import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    // Ohne `group` landet eine Collection unter Payloads Fallback-Überschrift
    // «Collections». Die sah in der Seitenleiste wie eine selbst gewählte
    // Kategorie aus, war aber nur der Rest — Users und Medien standen dort,
    // Icons eine Gruppe weiter, obwohl Icons und Medien dasselbe sind.
    group: 'Einstellungen',
  },
  auth: true,
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
}
