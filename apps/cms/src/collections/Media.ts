import type { CollectionConfig } from 'payload'

import { uploadCacheHeaders } from '../uploads/cacheHeaders'
import { mediaLesen } from './mediaZugriff'

/**
 * Kategorien der Bildablage. Sie bilden ab, wofür ein Bild auf titz.cooking
 * gebraucht wird — nicht, was zufällig darauf zu sehen ist. `hobby` ist die
 * einzige Kategorie mit einer zweiten Ebene, weil die Freizeitbilder den
 * Einträgen unter «Hobbies & Interessen» in den Stationen zugeordnet werden.
 */
export const MEDIA_KATEGORIEN = [
  { label: 'Porträt', value: 'portraet' },
  { label: 'Gerichte', value: 'gerichte' },
  { label: 'Küche & Handwerk', value: 'kueche' },
  { label: 'Team', value: 'team' },
  { label: 'Stationen (Betriebe)', value: 'stationen' },
  { label: 'Location', value: 'location' },
  { label: 'Events & Auftritte', value: 'event' },
  { label: 'Publikationen & Presse', value: 'publikation' },
  { label: 'Hobby', value: 'hobby' },
  { label: 'Privat', value: 'privat' },
] as const

/** Deckungsgleich mit der Gruppe «Hobbies & Interessen» in `stationen`. */
export const MEDIA_HOBBYS = [
  { label: 'Biken', value: 'biken' },
  { label: 'Garten', value: 'garten' },
  { label: 'Pfadfinder & Lagerkoch', value: 'pfadfinder' },
  { label: 'Outdoor-Kochen', value: 'outdoor-kochen' },
  { label: 'Sauerteig & Backen', value: 'backen' },
  { label: 'Skitouren', value: 'skitouren' },
  { label: 'Trailrunning', value: 'trailrunning' },
  { label: 'Yoga', value: 'yoga' },
  { label: 'Reisen', value: 'reisen' },
] as const

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Bild', plural: 'Medien' },
  admin: {
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'kategorie', 'hobby', 'verwendung'],
  },
  access: {
    read: mediaLesen,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alt-Text',
      required: true,
      admin: { description: 'Beschreibt das Bild für Screenreader und Suchmaschinen.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'kategorie',
          type: 'select',
          label: 'Kategorie',
          options: [...MEDIA_KATEGORIEN],
          admin: { width: '50%' },
        },
        {
          name: 'hobby',
          type: 'select',
          label: 'Hobby',
          options: [...MEDIA_HOBBYS],
          admin: {
            width: '50%',
            condition: (data) => data?.kategorie === 'hobby',
            description: 'Nur für Bilder der Kategorie «Hobby».',
          },
        },
      ],
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Bildlegende',
      admin: {
        description: 'Sichtbarer Text unter dem Bild, sofern die Seite eine Legende zeigt.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'jahr',
          type: 'number',
          label: 'Jahr',
          admin: { width: '50%', description: 'Aufnahmejahr, sofern bekannt.' },
        },
        {
          // Trennt Bildmaterial für die Seite von privaten Aufnahmen, die nur im
          // Archiv liegen. Die Collection ist öffentlich lesbar — `intern` ist
          // eine redaktionelle Kennzeichnung, keine Zugriffsbeschränkung.
          name: 'verwendung',
          type: 'select',
          label: 'Verwendung',
          defaultValue: 'web',
          options: [
            { label: 'Website', value: 'web' },
            { label: 'Intern / Archiv', value: 'intern' },
            { label: 'Rohdatei', value: 'archiv' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
  ],
  upload: {
    // These are not supported on Workers yet due to lack of sharp
    crop: false,
    focalPoint: false,
    modifyResponseHeaders: uploadCacheHeaders,
  },
}
