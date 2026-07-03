import type { Block, CollectionConfig } from 'payload'
import { iconSelect } from '../fields/iconSelect'
import { seoFields } from '../fields/seo'

const PhilosophieBlock: Block = {
  slug: 'philosophie',
  labels: { singular: 'Philosophie', plural: 'Philosophie' },
  fields: [
    { name: 'anchor', type: 'text', label: 'Anker', defaultValue: 'philosophie' },
    { name: 'eyebrow', type: 'text', label: 'Eyebrow / Überzeile' },
    { name: 'heading', type: 'text', label: 'Überschrift', required: true },
    { name: 'body', type: 'richText', label: 'Text' },
    { name: 'quote', type: 'textarea', label: 'Zitat' },
    { name: 'quoteSource', type: 'text', label: 'Zitat-Quelle' },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Bild' },
    {
      name: 'values',
      type: 'array',
      label: 'Werte / Stichpunkte',
      fields: [
        iconSelect(),
        { name: 'title', type: 'text', label: 'Titel', required: true },
        { name: 'text', type: 'textarea', label: 'Text' },
      ],
    },
  ],
}

const AngeboteBlock: Block = {
  slug: 'angeboteSection',
  labels: { singular: 'Angebote', plural: 'Angebote' },
  fields: [
    { name: 'anchor', type: 'text', label: 'Anker', defaultValue: 'angebote' },
    { name: 'eyebrow', type: 'text', label: 'Eyebrow / Überzeile' },
    { name: 'heading', type: 'text', label: 'Überschrift', required: true },
    { name: 'intro', type: 'textarea', label: 'Einleitung' },
    {
      name: 'angebote',
      type: 'relationship',
      relationTo: 'angebote',
      hasMany: true,
      label: 'Angebote (leer = alle, sortiert nach Reihenfolge)',
    },
  ],
}

const NewsBlock: Block = {
  slug: 'newsSection',
  labels: { singular: 'Aktuelles', plural: 'Aktuelles' },
  fields: [
    { name: 'anchor', type: 'text', label: 'Anker', defaultValue: 'aktuelles' },
    { name: 'eyebrow', type: 'text', label: 'Eyebrow / Überzeile' },
    { name: 'heading', type: 'text', label: 'Überschrift', required: true },
    { name: 'limit', type: 'number', label: 'Max. Einträge', defaultValue: 3 },
  ],
}

const SignatureDishesBlock: Block = {
  slug: 'signatureDishesSection',
  labels: { singular: 'Signature Dishes', plural: 'Signature Dishes' },
  fields: [
    { name: 'anchor', type: 'text', label: 'Anker', defaultValue: 'signature-dishes' },
    { name: 'eyebrow', type: 'text', label: 'Eyebrow / Überzeile' },
    { name: 'heading', type: 'text', label: 'Überschrift', required: true },
    { name: 'intro', type: 'textarea', label: 'Einleitung' },
  ],
}

const StationenBlock: Block = {
  slug: 'stationenSection',
  labels: { singular: 'Stationen / Lebenslauf', plural: 'Stationen / Lebenslauf' },
  fields: [
    { name: 'anchor', type: 'text', label: 'Anker', defaultValue: 'stationen' },
    { name: 'eyebrow', type: 'text', label: 'Eyebrow / Überzeile' },
    { name: 'heading', type: 'text', label: 'Überschrift', required: true },
    { name: 'intro', type: 'textarea', label: 'Einleitung' },
  ],
}

const VisitBlock: Block = {
  slug: 'visitSection',
  labels: { singular: 'Besuchen / Kontakt', plural: 'Besuchen / Kontakt' },
  fields: [
    { name: 'anchor', type: 'text', label: 'Anker', defaultValue: 'kontakt' },
    { name: 'eyebrow', type: 'text', label: 'Eyebrow / Überzeile' },
    { name: 'heading', type: 'text', label: 'Überschrift', required: true },
    { name: 'body', type: 'richText', label: 'Text' },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Bild' },
    { name: 'mapEmbedUrl', type: 'text', label: 'Google-Maps-Embed-URL' },
    {
      name: 'infos',
      type: 'array',
      label: 'Kontakt-Infos',
      fields: [
        iconSelect(),
        { name: 'label', type: 'text', label: 'Bezeichnung', required: true },
        { name: 'value', type: 'textarea', label: 'Wert', required: true },
        { name: 'url', type: 'text', label: 'Link (optional)' },
      ],
    },
    {
      name: 'cta',
      type: 'group',
      label: 'Call-to-Action',
      fields: [
        { name: 'label', type: 'text', label: 'Bezeichnung' },
        { name: 'url', type: 'text', label: 'URL' },
      ],
    },
    {
      name: 'secondaryCta',
      type: 'group',
      label: 'Sekundärer CTA',
      fields: [
        { name: 'label', type: 'text', label: 'Bezeichnung' },
        { name: 'url', type: 'text', label: 'URL' },
      ],
    },
  ],
}

const RichTextBlock: Block = {
  slug: 'richTextSection',
  labels: { singular: 'Freitext', plural: 'Freitext' },
  fields: [
    { name: 'anchor', type: 'text', label: 'Anker' },
    { name: 'heading', type: 'text', label: 'Überschrift' },
    { name: 'body', type: 'richText', label: 'Inhalt', required: true },
  ],
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Seite', plural: 'Seiten' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status'],
    group: 'Inhalte',
  },
  access: {
    read: () => true,
  },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', label: 'Titel', required: true },
    {
      name: 'slug',
      type: 'text',
      label: 'Slug',
      required: true,
      unique: true,
      index: true,
      admin: { description: '«home» für die Startseite' },
    },
    {
      name: 'sections',
      type: 'blocks',
      label: 'Sektionen',
      blocks: [
        PhilosophieBlock,
        AngeboteBlock,
        NewsBlock,
        SignatureDishesBlock,
        StationenBlock,
        VisitBlock,
        RichTextBlock,
      ],
    },
    seoFields,
  ],
}
