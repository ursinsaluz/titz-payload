/**
 * Tägliche Synchronisation der neusten Instagram-Beiträge von @titzsebastian
 * in die Payload-Collection `instagram-posts` (inklusive Upload der Bilder
 * nach R2 `media`).
 *
 * Unterstützt zwei Quellen ohne zusätzliche Library:
 * 1. Offizielle Instagram Graph API (`INSTAGRAM_ACCESS_TOKEN`):
 *    Ruft `https://graph.instagram.com/v22.0/me/media` ab und verlängert
 *    das Long-Lived Token bei jedem Lauf automatisch um 60 Tage.
 * 2. JSON-Feed wie Behold.so (`INSTAGRAM_FEED_URL`):
 *    Ruft die JSON-URL direkt ab.
 *
 * Zusätzlich richtet das Skript beim ersten Lauf (falls noch leer) die
 * `instagramSection` auf der Startseite (`home`) sowie 4 initiale Beiträge aus
 * dem vorhandenen Bildbestand ein.
 *
 *   cd apps/cms
 *   NODE_ENV=production PAYLOAD_SECRET=ignore INSTAGRAM_APPLY=1 \
 *     npx payload run scripts/syncInstagram.ts
 */
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'

const APPLY = process.env.INSTAGRAM_APPLY === '1'
const tat = APPLY ? 'schreiben: ' : 'würde:     '
const LIMIT = Number(process.env.INSTAGRAM_LIMIT || '6')

interface ExternerPost {
  id: string
  caption: string
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  imageUrl: string
  permalink: string
  timestamp: string
}

const toUploadData = (buffer: Buffer): Buffer =>
  new Uint8Array(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  ) as unknown as Buffer

async function ladeVonGraphApi(token: string): Promise<ExternerPost[]> {
  const felder = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp'
  const url = `https://graph.instagram.com/v22.0/me/media?fields=${felder}&limit=${LIMIT}&access_token=${encodeURIComponent(token)}`
  const antwort = await fetch(url)
  if (!antwort.ok) {
    throw new Error(`Instagram Graph API antwortete mit ${antwort.status}: ${await antwort.text()}`)
  }
  const daten = (await antwort.json()) as {
    data?: Array<{
      id: string
      caption?: string
      media_type?: string
      media_url?: string
      thumbnail_url?: string
      permalink: string
      timestamp: string
    }>
  }

  // Long-Lived Token direkt für weitere 60 Tage frisch halten
  try {
    await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
    )
  } catch {
    // Token-Refresh ist optional und darf den Beitrags-Sync nicht abbrechen
  }

  return (daten.data ?? [])
    .map((eintrag) => {
      const mediaType: ExternerPost['mediaType'] =
        eintrag.media_type === 'VIDEO' || eintrag.media_type === 'CAROUSEL_ALBUM'
          ? eintrag.media_type
          : 'IMAGE'
      const imageUrl =
        mediaType === 'VIDEO'
          ? (eintrag.thumbnail_url ?? eintrag.media_url ?? '')
          : (eintrag.media_url ?? eintrag.thumbnail_url ?? '')
      return {
        id: String(eintrag.id),
        caption: (eintrag.caption ?? 'Einblick aus der Küche von Sebastian Titz.').trim(),
        mediaType,
        imageUrl,
        permalink: eintrag.permalink,
        timestamp: new Date(eintrag.timestamp).toISOString(),
      }
    })
    .filter((p) => Boolean(p.imageUrl))
}

async function ladeVonFeedUrl(feedUrl: string): Promise<ExternerPost[]> {
  const antwort = await fetch(feedUrl)
  if (!antwort.ok) {
    throw new Error(`Instagram-Feed antwortete mit ${antwort.status}: ${await antwort.text()}`)
  }
  const roh = (await antwort.json()) as
    | Array<Record<string, unknown>>
    | { posts?: Array<Record<string, unknown>>; data?: Array<Record<string, unknown>> }

  const liste = Array.isArray(roh) ? roh : (roh.posts ?? roh.data ?? [])

  return liste
    .slice(0, LIMIT)
    .map((eintrag) => {
      const typRoh = String(eintrag.mediaType ?? eintrag.media_type ?? 'IMAGE').toUpperCase()
      const mediaType: ExternerPost['mediaType'] =
        typRoh.includes('VIDEO') || typRoh.includes('REEL')
          ? 'VIDEO'
          : typRoh.includes('CAROUSEL')
            ? 'CAROUSEL_ALBUM'
            : 'IMAGE'

      const sizes = eintrag.sizes as
        { large?: { mediaUrl?: string }; medium?: { mediaUrl?: string } } | undefined
      const imageUrl = String(
        sizes?.large?.mediaUrl ??
          sizes?.medium?.mediaUrl ??
          eintrag.thumbnailUrl ??
          eintrag.thumbnail_url ??
          eintrag.mediaUrl ??
          eintrag.media_url ??
          '',
      )

      return {
        id: String(eintrag.id),
        caption: String(
          eintrag.prunedCaption ?? eintrag.caption ?? 'Einblick aus der Küche von Sebastian Titz.',
        ).trim(),
        mediaType,
        imageUrl,
        permalink: String(eintrag.permalink ?? 'https://www.instagram.com/titzsebastian/'),
        timestamp: new Date(String(eintrag.timestamp ?? new Date().toISOString())).toISOString(),
      }
    })
    .filter((p) => Boolean(p.imageUrl))
}

async function speichereBildInMedia(payload: Payload, post: ExternerPost): Promise<number | null> {
  const dateiname = `ig-${post.id}.jpg`
  const vorhanden = await payload.find({
    collection: 'media',
    where: { filename: { equals: dateiname } },
    limit: 1,
    depth: 0,
  })
  if (vorhanden.docs[0]) return Number(vorhanden.docs[0].id)

  const bildAntwort = await fetch(post.imageUrl)
  if (!bildAntwort.ok) {
    console.warn(`  ! Bild konnte nicht geladen werden (${bildAntwort.status}): ${post.imageUrl}`)
    return null
  }
  const arrayBuf = await bildAntwort.arrayBuffer()
  const buffer = Buffer.from(arrayBuf)
  const contentType = bildAntwort.headers.get('content-type') || 'image/jpeg'
  const endung = contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg'
  const finalName = `ig-${post.id}.${endung}`

  const doc = await payload.create({
    collection: 'media',
    data: {
      alt: post.caption.slice(0, 120) || 'Instagram-Beitrag von @titzsebastian',
      kategorie: 'kueche',
      verwendung: 'web',
    },
    file: {
      data: toUploadData(buffer),
      name: finalName,
      mimetype: contentType,
      size: buffer.length,
    },
  })
  return Number(doc.id)
}

async function stelleStartseitenSektionSicher(payload: Payload) {
  const home = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
    depth: 0,
  })
  const seite = home.docs[0]
  if (!seite || !Array.isArray(seite.sections)) return

  const hatInstagram = seite.sections.some((s) => s.blockType === 'instagramSection')
  if (hatInstagram) {
    console.log('  vorhanden: instagramSection auf Startseite')
    return
  }

  console.log(`  ${tat}instagramSection auf Startseite «home» ergänzen`)
  if (APPLY) {
    const neueSections = [
      ...seite.sections,
      {
        blockType: 'instagramSection' as const,
        anchor: 'instagram',
        eyebrow: 'Aus der Küche · @titzsebastian',
        heading: 'Einblicke auf Instagram',
        handle: '@titzsebastian',
        profileUrl: 'https://www.instagram.com/titzsebastian/',
        limit: 4,
      },
    ]
    await payload.update({
      collection: 'pages',
      id: seite.id,
      data: {
        sections: neueSections,
        _status: 'published',
      },
    })
  }
}

async function legeInitialePostsAnFallsLeer(payload: Payload) {
  const bestehende = await payload.find({
    collection: 'instagram-posts',
    limit: 20,
    depth: 1,
  })

  // Falls ein bestehender initialer Beitrag versehentlich auf ein Video (video/mp4) zeigt, auf das Standbild (image/*) korrigieren
  for (const doc of bestehende.docs) {
    const img = typeof doc.image === 'object' && doc.image !== null ? doc.image : null
    if (img && !(img.mimeType ?? '').startsWith('image/')) {
      const ersatz = await payload.find({
        collection: 'media',
        where: {
          and: [
            { verwendung: { equals: 'web' } },
            { mimeType: { like: 'image/%' } },
            { filename: { like: '%kraeuter%' } },
          ],
        },
        limit: 1,
        depth: 0,
      })
      if (ersatz.docs[0]) {
        console.log(
          `  ${tat}Vorschaubild für «${doc.instagramId}» auf Bilddatei (${ersatz.docs[0].filename}) korrigieren`,
        )
        if (APPLY) {
          await payload.update({
            collection: 'instagram-posts',
            id: doc.id,
            data: { image: ersatz.docs[0].id },
          })
        }
      }
    }
  }

  if (bestehende.totalDocs > 0) return

  const medien = await payload.find({
    collection: 'media',
    where: {
      and: [{ verwendung: { equals: 'web' } }, { mimeType: { like: 'image/%' } }],
    },
    limit: 100,
    depth: 0,
  })
  const findeBild = (suchbegriff: string) =>
    medien.docs.find(
      (m) =>
        (m.mimeType ?? '').startsWith('image/') &&
        ((m.filename ?? '').toLowerCase().includes(suchbegriff) ||
          (m.alt ?? '').toLowerCase().includes(suchbegriff)),
    )?.id ?? medien.docs[0]?.id

  const initial: Array<{
    instagramId: string
    publishedAt: string
    mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
    permalink: string
    caption: string
    image: number | undefined
  }> = [
    {
      instagramId: 'ig-seed-flaescher-senf',
      publishedAt: '2026-10-20T10:00:00.000Z',
      mediaType: 'CAROUSEL_ALBUM',
      permalink: 'https://www.instagram.com/titzsebastian/',
      caption:
        'Viermal Fläscher Bio-Senf aus der Ernte von Adanks Biofarm: Gelbsenf, Braunsenf, Knoblauchsenf und Safransenf — mit Birnell statt raffiniertem Zucker.',
      image: findeBild('gelbsenf'),
    },
    {
      instagramId: 'ig-seed-kraeutertour-pinot',
      publishedAt: '2026-10-16T14:00:00.000Z',
      mediaType: 'VIDEO',
      permalink: 'https://www.instagram.com/titzsebastian/',
      caption:
        'Kräutertour ums Restaurant PINOT in Fläsch: frischer Lorbeer, junge Rosmarinspitzen für die Beurre blanc und wilder Oregano von der warmen Steinmauer.',
      image: findeBild('kraeuter'),
    },
    {
      instagramId: 'ig-seed-gourmetabend-pinot',
      publishedAt: '2026-10-08T17:00:00.000Z',
      mediaType: 'IMAGE',
      permalink: 'https://www.instagram.com/titzsebastian/',
      caption:
        'Donnerstag ist Gourmetabend im PINOT: ein Überraschungsmenü aus dem, was die Woche in der Bündner Herrschaft und im St. Galler Rheintal hergibt.',
      image: findeBild('teller'),
    },
    {
      instagramId: 'ig-seed-handwerk-am-pass',
      publishedAt: '2026-09-28T18:30:00.000Z',
      mediaType: 'IMAGE',
      permalink: 'https://www.instagram.com/titzsebastian/',
      caption:
        'Letzter Handgriff am Pass: schnörkellose Gerichte, ehrliches Handwerk und volle Konzentration auf den Geschmack.',
      image: findeBild('anrichten'),
    },
  ]

  for (const eintrag of initial) {
    if (!eintrag.image) continue
    console.log(`  ${tat}initialer Instagram-Beitrag «${eintrag.instagramId}»`)
    if (APPLY) {
      await payload.create({
        collection: 'instagram-posts',
        data: {
          instagramId: eintrag.instagramId,
          publishedAt: eintrag.publishedAt,
          mediaType: eintrag.mediaType,
          permalink: eintrag.permalink,
          caption: eintrag.caption,
          image: eintrag.image,
        },
      })
    }
  }
}

const payload = await getPayload({ config })

await stelleStartseitenSektionSicher(payload)

const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim()
const feedUrl = process.env.INSTAGRAM_FEED_URL?.trim()

if (token || feedUrl) {
  const posts = token ? await ladeVonGraphApi(token) : await ladeVonFeedUrl(feedUrl!)
  console.log(`  ${posts.length} Beiträge aus Instagram-Quelle geladen`)

  for (const post of posts) {
    const vorhanden = await payload.find({
      collection: 'instagram-posts',
      where: { instagramId: { equals: post.id } },
      limit: 1,
      depth: 0,
    })

    if (vorhanden.docs[0]) {
      const doc = vorhanden.docs[0]
      if (doc.caption !== post.caption || doc.permalink !== post.permalink) {
        console.log(`  ${tat}aktualisieren ${post.id}`)
        if (APPLY) {
          await payload.update({
            collection: 'instagram-posts',
            id: doc.id,
            data: {
              caption: post.caption,
              permalink: post.permalink,
              mediaType: post.mediaType,
              publishedAt: post.timestamp,
            },
          })
        }
      } else {
        console.log(`  unverändert: ${post.id}`)
      }
      continue
    }

    console.log(`  ${tat}neu anlegen ${post.id} (${post.timestamp.slice(0, 10)})`)
    if (APPLY) {
      const imageId = await speichereBildInMedia(payload, post)
      if (!imageId) continue
      await payload.create({
        collection: 'instagram-posts',
        data: {
          instagramId: post.id,
          publishedAt: post.timestamp,
          mediaType: post.mediaType,
          permalink: post.permalink,
          caption: post.caption,
          image: imageId,
        },
      })
    }
  }
} else {
  console.log(
    '  Kein INSTAGRAM_ACCESS_TOKEN oder INSTAGRAM_FEED_URL gesetzt — prüfe initiale Beiträge.',
  )
  await legeInitialePostsAnFallsLeer(payload)
}

console.log(APPLY ? '\nGeschrieben.' : '\nNichts geschrieben (INSTAGRAM_APPLY=1 zum Schreiben).')
