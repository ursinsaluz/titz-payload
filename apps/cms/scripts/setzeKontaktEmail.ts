/**
 * Ersetzt in Produktion überall `info@titz.cooking` durch `sebastian@titz.cooking`:
 * 1. Global `footer` (`contact.email`)
 * 2. Collection `angebote` (`cta.url`)
 * 3. Collection `pages` (`home` -> `visitSection.secondaryCta.url` sowie `impressum` -> Lexical-Body)
 *
 *   cd apps/cms
 *   NODE_ENV=production PAYLOAD_SECRET=ignore EMAIL_APPLY=1 \
 *     npx payload run scripts/setzeKontaktEmail.ts
 */
import { getPayload } from 'payload'
import config from '@payload-config'

const APPLY = process.env.EMAIL_APPLY === '1'
const tat = APPLY ? 'schreiben: ' : 'würde:     '
const ALT = 'info@titz.cooking'
const NEU = 'sebastian@titz.cooking'

const payload = await getPayload({ config })

// 1. Global `footer`
{
  const footer = await payload.findGlobal({ slug: 'footer', depth: 0 })
  if (footer.contact?.email === ALT) {
    console.log(`  ${tat}Global footer.contact.email: ${ALT} → ${NEU}`)
    if (APPLY) {
      await payload.updateGlobal({
        slug: 'footer',
        data: {
          contact: {
            ...footer.contact,
            email: NEU,
          },
        },
      })
    }
  } else {
    console.log(`  bereits aktuell: footer.contact.email (${footer.contact?.email})`)
  }
}

// 2. Collection `angebote`
{
  const angebote = await payload.find({
    collection: 'angebote',
    limit: 50,
    depth: 0,
  })
  for (const doc of angebote.docs) {
    const url = doc.cta?.url ?? ''
    if (url.includes(ALT)) {
      const neueUrl = url.replaceAll(ALT, NEU)
      console.log(`  ${tat}Angebot «${doc.title}» cta.url: ${url} → ${neueUrl}`)
      if (APPLY) {
        await payload.update({
          collection: 'angebote',
          id: doc.id,
          data: {
            cta: {
              label: doc.cta?.label ?? 'Anfragen',
              url: neueUrl,
            },
          },
        })
      }
    } else {
      console.log(`  bereits aktuell: Angebot «${doc.title}» (${url})`)
    }
  }
}

// 3. Collection `pages` (`home` + `impressum`)
{
  const seiten = await payload.find({
    collection: 'pages',
    limit: 50,
    depth: 0,
  })

  for (const seite of seiten.docs) {
    const raw = JSON.stringify(seite.sections ?? [])
    if (!raw.includes(ALT)) {
      console.log(`  bereits aktuell: Seite «${seite.slug}»`)
      continue
    }

    const neueSections = JSON.parse(raw.replaceAll(ALT, NEU))
    console.log(`  ${tat}Seite «${seite.slug}» sections: ${ALT} → ${NEU}`)
    if (APPLY) {
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
}

console.log(APPLY ? '\nGeschrieben.' : '\nNichts geschrieben (EMAIL_APPLY=1 zum Schreiben).')
