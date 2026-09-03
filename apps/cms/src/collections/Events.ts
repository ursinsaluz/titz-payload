import type { CollectionConfig } from 'payload'
import { iconSelect } from '../fields/iconSelect'
import { seoFields } from '../fields/seo'
import { slugFeld } from '../fields/slugFeld'

/**
 * Anlässe, die noch kommen.
 *
 * Zwei Arten in einer Sammlung, weil sie im Frontend dieselbe Liste bilden:
 * der wöchentliche Gourmetabend und einzelne Termine. Der Unterschied steckt
 * in `rhythmus` und entscheidet, was angezeigt wird — «Jeden Donnerstag,
 * 18:00» oder ein Datum.
 *
 * Für die Suche ist das die wertvollste Sammlung im Projekt: Aus `Event` baut
 * Google eigene Termin-Ergebnisse, und ein wiederkehrender Anlass mit
 * wechselndem Menü ist genau der regelmässige, echte Inhalt, den eine
 * Portfolio-Seite sonst nicht hat.
 *
 * **Vergangene Termine verschwinden erst beim nächsten Build.** Das Frontend
 * ist statisch, der Filter läuft also zur Bauzeit. Ein Build passiert bei jeder
 * Inhaltsänderung — wer wochenlang nichts speichert, hat einen abgelaufenen
 * Termin stehen. Wenn das störend wird, ist der Weg ein täglicher Cron auf den
 * Deploy-Hook, nicht ein Filter im Browser: Was im HTML steht, ist das, was
 * Google sieht.
 */
export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Anlass', plural: 'Anlässe' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'rhythmus', 'datum', '_status'],
    group: 'Inhalt',
  },
  access: {
    read: () => true,
  },
  versions: { drafts: true },
  defaultSort: 'datum',
  fields: [
    { name: 'title', type: 'text', label: 'Titel', required: true },
    slugFeld('events'),
    {
      name: 'rhythmus',
      type: 'select',
      label: 'Rhythmus',
      required: true,
      defaultValue: 'einmalig',
      options: [
        { label: 'Einzelner Termin', value: 'einmalig' },
        { label: 'Wöchentlich', value: 'woechentlich' },
      ],
    },
    {
      name: 'wochentag',
      type: 'select',
      label: 'Wochentag',
      admin: {
        condition: (_, gleichrangig) => gleichrangig?.rhythmus === 'woechentlich',
        description: 'Bestimmt die Anzeige und das Termin-Schema für Google.',
      },
      options: [
        { label: 'Montag', value: 'Monday' },
        { label: 'Dienstag', value: 'Tuesday' },
        { label: 'Mittwoch', value: 'Wednesday' },
        { label: 'Donnerstag', value: 'Thursday' },
        { label: 'Freitag', value: 'Friday' },
        { label: 'Samstag', value: 'Saturday' },
        { label: 'Sonntag', value: 'Sunday' },
      ],
    },
    {
      name: 'datum',
      type: 'date',
      label: 'Datum',
      admin: {
        description:
          'Bei einem einzelnen Termin das Datum. Bei einem wöchentlichen Anlass der Beginn der Reihe — er bleibt danach stehen.',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' },
      },
    },
    {
      name: 'zeit',
      type: 'text',
      label: 'Beginn',
      admin: { description: 'Als «18:00». Wird so angezeigt und ins Schema übernommen.' },
    },
    { name: 'eyebrow', type: 'text', label: 'Eyebrow / Überzeile' },
    iconSelect(),
    { name: 'excerpt', type: 'textarea', label: 'Kurztext', required: true },
    { name: 'body', type: 'richText', label: 'Beschreibung' },
    {
      name: 'menu',
      type: 'array',
      label: 'Menü / Gänge',
      admin: { description: 'Optional. Wechselt beim Gourmetabend wöchentlich.' },
      fields: [{ name: 'text', type: 'text', label: 'Gang', required: true }],
    },
    { name: 'preis', type: 'text', label: 'Preis', admin: { description: 'z.B. «CHF 98»' } },
    {
      name: 'ort',
      type: 'text',
      label: 'Ort',
      defaultValue: 'Restaurant PINOT, Steigstrasse 12, 7306 Fläsch',
    },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Bild' },
    {
      name: 'cta',
      type: 'group',
      label: 'Call-to-Action',
      fields: [
        { name: 'label', type: 'text', label: 'Bezeichnung' },
        { name: 'url', type: 'text', label: 'URL' },
      ],
    },
    seoFields,
  ],
}
