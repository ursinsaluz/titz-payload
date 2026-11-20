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
    imageUrl?: string
    image?: number | undefined
  }> = [
    {
      instagramId: '3946198640584862668',
      publishedAt: '2026-07-21T12:00:00.000Z',
      mediaType: 'VIDEO',
      permalink: 'https://www.instagram.com/restaurantpinot/reel/DbDtsF5MKvM/',
      caption:
        'Die perfekte Basis für deine Grillsaison: Küchenchef Sebastian Titz zeigt, wie eine cremige vegane Mayonnaise gelingt — nach Lust verfeinert mit Knoblauch, frischen Kräutern oder Chili.',
      imageUrl:
        'https://scontent-zrh1-1.cdninstagram.com/v/t51.82787-15/754069846_17914589025425226_1281995960499053465_n.jpg?stp=dst-jpg_e35_s640x640_tt6&_nc_cat=105&_nc_map=urlgen_bucketless&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0xJUFMuYmVzdF9pbWFnZV91cmxnZW4uQzMifQ%3D%3D&_nc_ohc=rxSiz1w3kW4Q7kNvwHitFo2&_nc_oc=AdqO0BMwUJ2jjnNVu-NWJaZk_UYRJNpfOeh8SzHtGo0iScZ2Wq-5ELyzcqB1G0SWhClqyYuu9DVeXWsYL8nAWbOs&_nc_zt=23&_nc_ht=scontent-zrh1-1.cdninstagram.com&_nc_gid=hj-P2Srf35EsW7dFcgQ4Jg&_nc_ss=7a689&_nc_ct=RQosPBUKFQQAAAA&oh=00_AQTfm4RfC2zbVg7AIzcaSVfhwcRC3ceYko3kfoTjitGCrQ&oe=6B062140',
      image: findeBild('kraeuter'),
    },
    {
      instagramId: '3749049001652790757',
      publishedAt: '2025-10-22T12:00:00.000Z',
      mediaType: 'IMAGE',
      permalink: 'https://www.instagram.com/restaurantpinot/p/DQHTDQlDCXl/',
      caption:
        'Wir haben wieder den Bib Gourmand erhalten! Ein grosses Dankeschön an unser engagiertes PINOT-Team und an unsere Gäste für die Unterstützung.',
      imageUrl:
        'https://scontent-zrh1-1.cdninstagram.com/v/t51.82787-15/569842640_17876632503425226_8828631227009563096_n.jpg?stp=dst-jpg_e35_s640x640_tt6&_nc_cat=102&_nc_map=urlgen_bucketless&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiRkVFRC5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=S3JfrnYyuF8Q7kNvwEZ9Z40&_nc_oc=AdqTIABGtmaeqVv1K3BnHrr03GgM7N5zcXIznqHMzJaiY-MFLaungS51YXGAfkxTJ57CylJAF1GMOCcWe1FjWJBR&_nc_zt=23&_nc_ht=scontent-zrh1-1.cdninstagram.com&_nc_gid=hj-P2Srf35EsW7dFcgQ4Jg&_nc_ss=7a689&_nc_ct=RQosPBUKFQIAAAA&oh=00_AQT_pPyPfDbY1_0T1KRRagDqM3noac2KVAbFG-G4AMm0yw&oe=6B065692',
      image: findeBild('teller'),
    },
    {
      instagramId: '3748459963245710899',
      publishedAt: '2025-10-21T12:00:00.000Z',
      mediaType: 'VIDEO',
      permalink: 'https://www.instagram.com/spitzner_kn/reel/DQFNHn0CM4z/',
      caption:
        'Was kochst du?! Mit den Chefs Andy Piesche, Sebastian Titz und Felix Jarzina im Restaurant Spitzner Münster. Das ganze Gespräch auf YouTube.',
      imageUrl:
        'https://scontent-zrh1-1.cdninstagram.com/v/t51.71878-15/568843828_1271058464790973_2282361462662486864_n.jpg?stp=dst-jpg_e35_s640x640_tt6&_nc_cat=107&_nc_map=urlgen_bucketless&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0xJUFMuYmVzdF9pbWFnZV91cmxnZW4uQzMifQ%3D%3D&_nc_ohc=GR25zV0d-eUQ7kNvwFdwJuv&_nc_oc=AdrbcOdP3a_EN36Lnr_Cb_AwLMFy70-dLYB8uYs7f6_bY6u1FQXyt5BNmWPxwuvFzrdHWrDAchrXMa6I1Rh-bvR2&_nc_zt=23&_nc_ht=scontent-zrh1-1.cdninstagram.com&_nc_gid=hj-P2Srf35EsW7dFcgQ4Jg&_nc_ss=7a689&_nc_ct=RQosPBUKFQgAAAA&oh=00_AQRHUktdepDswS8VayMAt4J0LuiN8nDNFLNEi7bKqu_TQQ&oe=6B065665',
      image: findeBild('anrichten'),
    },
    {
      instagramId: '3743811748840139453',
      publishedAt: '2025-10-15T12:00:00.000Z',
      mediaType: 'IMAGE',
      permalink: 'https://www.instagram.com/restaurantpinot/p/DP0sPMzjOq9/',
      caption:
        'Ausgezeichnet im Falstaff Magazin mit drei Gabeln als eines der besten Restaurants der Schweiz — regionale, saisonale Küche im Restaurant PINOT in Fläsch.',
      imageUrl:
        'https://scontent-zrh1-1.cdninstagram.com/v/t51.82787-15/565878900_17875852152425226_7656015288598478607_n.jpg?stp=dst-jpg_e35_s640x640_tt6&_nc_cat=106&_nc_map=urlgen_bucketless&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiRkVFRC5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=au2zYmPUyM4Q7kNvwGZkqvG&_nc_oc=AdoeblLrSO3hScbFJo8I2GxEN4kPaHNAybbR1_Y4fze6W-NiFSwoDCdGoxhBWwWtG5L57C73zanBBVbbEm_-FGnK&_nc_zt=23&_nc_ht=scontent-zrh1-1.cdninstagram.com&_nc_gid=hj-P2Srf35EsW7dFcgQ4Jg&_nc_ss=7a689&_nc_ct=RQosPBUKFQIAAAA&oh=00_AQSV4C3HGRnonuvTp2AevCaIxqJgIgrrQl8PiuFNJmcRTw&oe=6B0627BA',
      image: findeBild('tisch'),
    },
  ]

  // Alte Platzhalter (`ig-seed-*`) entfernen, falls vorhanden
  for (const doc of bestehende.docs) {
    if (doc.instagramId.startsWith('ig-seed-')) {
      console.log(`  ${tat}Platzhalter «${doc.instagramId}» durch echten Post ersetzen`)
      if (APPLY) {
        await payload.delete({ collection: 'instagram-posts', id: doc.id })
      }
    }
  }

  for (const eintrag of initial) {
    const schonDa = bestehende.docs.find((d) => d.instagramId === eintrag.instagramId)
    if (schonDa) {
      console.log(`  vorhanden: ${eintrag.instagramId} (${eintrag.permalink})`)
      continue
    }

    console.log(`  ${tat}echter Instagram-Beitrag «${eintrag.instagramId}» (${eintrag.permalink})`)
    if (APPLY) {
      let imageId: number | null | undefined = undefined
      if (eintrag.imageUrl) {
        imageId = await speichereBildInMedia(payload, {
          id: eintrag.instagramId,
          caption: eintrag.caption,
          mediaType: eintrag.mediaType,
          imageUrl: eintrag.imageUrl,
          permalink: eintrag.permalink,
          timestamp: eintrag.publishedAt,
        })
      }
      const finalImage = imageId ?? eintrag.image
      if (!finalImage) continue
      await payload.create({
        collection: 'instagram-posts',
        data: {
          instagramId: eintrag.instagramId,
          publishedAt: eintrag.publishedAt,
          mediaType: eintrag.mediaType,
          permalink: eintrag.permalink,
          caption: eintrag.caption,
          image: finalImage,
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
