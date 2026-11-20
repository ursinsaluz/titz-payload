import type { CollectionConfig } from 'payload'

/**
 * Instagram-Beiträge von @titzsebastian.
 *
 * Werden einmal täglich per Sync-Skript (`scripts/syncInstagram.ts`) über die
 * Instagram Graph API (oder einen JSON-Feed wie Behold.so) abgeglichen und in
 * der Mediathek (`media` / R2) zwischengespeichert. Dadurch lädt das statische
 * Frontend beim Seitenbesuch keinerlei Daten von Meta-Servern (0 KB externes
 * JS, kein Tracking, keine Cookie-Banner-Pflicht, volle Bildtransformation über
 * `/cdn-cgi/image/`).
 *
 * Zusätzlich lassen sich Beiträge jederzeit direkt im Admin anlegen oder
 * anpassen.
 */
export const InstagramPosts: CollectionConfig = {
  slug: 'instagram-posts',
  labels: { singular: 'Instagram-Post', plural: 'Instagram' },
  admin: {
    useAsTitle: 'caption',
    defaultColumns: ['caption', 'mediaType', 'publishedAt', 'permalink'],
    group: 'Inhalt',
  },
  access: {
    read: () => true,
  },
  defaultSort: '-publishedAt',
  fields: [
    {
      name: 'instagramId',
      type: 'text',
      label: 'Instagram-ID',
      required: true,
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Eindeutige ID des Beitrags (für den täglichen Sync ohne Duplikate).',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Veröffentlicht am',
      required: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' },
      },
    },
    {
      name: 'mediaType',
      type: 'select',
      label: 'Medientyp',
      required: true,
      defaultValue: 'IMAGE',
      options: [
        { label: 'Foto', value: 'IMAGE' },
        { label: 'Video / Reel', value: 'VIDEO' },
        { label: 'Karussell', value: 'CAROUSEL_ALBUM' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'permalink',
      type: 'text',
      label: 'Instagram-Link',
      required: true,
      admin: {
        description: 'Direkter Link zum Beitrag auf instagram.com',
      },
    },
    {
      name: 'caption',
      type: 'textarea',
      label: 'Bildtext (Caption)',
      required: true,
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Vorschaubild (R2)',
      required: true,
    },
  ],
}
