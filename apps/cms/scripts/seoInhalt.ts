/**
 * Die inhaltliche Hälfte der SEO-Arbeit: Zielregionen ergänzen, Titel und
 * Beschreibung schärfen, den Gourmetabend als Anlass anlegen und die
 * Anlässe-Sektion auf der Startseite einhängen. Dazu die zweite falsche
 * Hausnummer, die im Footer stand.
 *
 *   cd apps/cms
 *   NODE_ENV=production PAYLOAD_SECRET=ignore SEO_APPLY=1 \
 *     npx payload run scripts/seoInhalt.ts
 *
 * **Warum das Inhalt ist und nicht Code.** Eine Seite kann für ein Wort nicht
 * ranken, das sie nicht enthält. Gemessen am 02.09.2026 kamen «Sarganserland»
 * und «Werdenberg» auf titz.cooking null Mal vor, «Privatkoch» ebenfalls — bei
 * «Fläsch» achtmal. Kein technischer Eingriff ändert daran etwas.
 *
 * Es geht nicht um Wortdichte. Jede Ergänzung hier ist eine Aussage, die
 * stimmt: Das Einsatzgebiet für Catering *ist* Herrschaft, Sarganserland und
 * Werdenberg, und für kleine Runden kocht er *als* Privatkoch. Wer Regionen
 * aufzählt, in denen er nicht arbeitet, gewinnt Anfragen, die er absagen muss.
 *
 * Idempotent: Ein zweiter Lauf meldet überall «vorhanden».
 */
import { getPayload } from 'payload'
import config from '@payload-config'
import { slugify } from '../src/fields/slugFeld'

const APPLY = process.env.SEO_APPLY === '1'

const payload = await getPayload({ config })
const tat = APPLY ? '' : 'würde: '

console.log(APPLY ? '── Schreibmodus ──\n' : '── Nur Bericht (SEO_APPLY=1 zum Schreiben) ──\n')

/** Ersetzt Text in einem Lexical-Baum, ohne die Struktur anzufassen. */
function ersetzeImText(knoten: unknown, alt: string, neu: string): boolean {
  if (Array.isArray(knoten)) {
    return knoten.map((k) => ersetzeImText(k, alt, neu)).some(Boolean)
  }
  if (!knoten || typeof knoten !== 'object') return false

  const o = knoten as Record<string, unknown>
  let geaendert = false

  if (typeof o.text === 'string' && o.text.includes(alt)) {
    o.text = o.text.replace(alt, neu)
    geaendert = true
  }
  for (const wert of Object.values(o)) {
    if (wert && typeof wert === 'object' && ersetzeImText(wert, alt, neu)) geaendert = true
  }
  return geaendert
}

// ── 1. Titel und Beschreibung: Beruf und Region hinein ───────────────────
{
  const s = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  const titel = 'Sebastian Titz — Chefkoch in Fläsch, Bündner Herrschaft'
  // 157 Zeichen. Google schneidet Beschreibungen bei etwa 158 ab — eine
  // längere Fassung verliert genau das Ende, und dort stehen die Regionen.
  const beschreibung =
    'Küchenchef im PINOT, Fläsch. Catering, Privatkoch und Gastroberatung in ' +
    'Bündner Herrschaft, Sarganserland und Werdenberg — schnörkellos, regional, exzellent.'

  if (s.defaultSeo?.title === titel && s.defaultSeo?.description === beschreibung) {
    console.log('  vorhanden: SEO-Titel und -Beschreibung')
  } else {
    console.log(`  ${tat}SEO-Titel → «${titel}» (${titel.length} Zeichen)`)
    console.log(`  ${tat}SEO-Beschreibung → ${beschreibung.length} Zeichen`)
    if (APPLY) {
      await payload.updateGlobal({
        slug: 'site-settings',
        data: { defaultSeo: { ...(s.defaultSeo ?? {}), title: titel, description: beschreibung } },
      })
    }
  }
}

// ── 1b. Die Startseite überschreibt die Standardwerte ────────────────────
{
  // Base.astro liest `seo.title` der Seite **vor** `defaultSeo` — die
  // Standardwerte greifen also nur, wo eine Seite nichts eigenes hat. Die
  // Startseite hat etwas eigenes, und darum hätte Schritt 1 allein nichts
  // geändert. Beide Stellen tragen ab jetzt denselben Text.
  const treffer = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
    depth: 0,
  })
  const seite = treffer.docs[0]
  const titel = 'Sebastian Titz — Chefkoch in Fläsch, Bündner Herrschaft'
  const beschreibung =
    'Küchenchef im PINOT, Fläsch. Catering, Privatkoch und Gastroberatung in ' +
    'Bündner Herrschaft, Sarganserland und Werdenberg — schnörkellos, regional, exzellent.'

  if (!seite) {
    console.log('  ! Startseite nicht gefunden')
  } else if (seite.seo?.title === titel && seite.seo?.description === beschreibung) {
    console.log('  vorhanden: SEO der Startseite')
  } else {
    console.log(`  ${tat}SEO der Startseite → Titel und Beschreibung wie oben`)
    if (APPLY) {
      await payload.update({
        collection: 'pages',
        id: seite.id,
        data: { seo: { ...(seite.seo ?? {}), title: titel, description: beschreibung } },
      })
    }
  }
}

// ── 2. Die Eyebrow, die jetzt im h1 steht ────────────────────────────────
{
  const h = await payload.findGlobal({ slug: 'header', depth: 0 })
  const eyebrow = 'Sebastian Titz · Chefkoch · Fläsch, Bündner Herrschaft'

  if (h.stage?.eyebrow === eyebrow) {
    console.log('  vorhanden: Stage-Eyebrow')
  } else {
    // Sie ist seit heute Teil des h1 — das stärkste inhaltliche Signal der
    // Seite. Vorher stand dort «… · Fläsch» ohne Region.
    console.log(`  ${tat}Stage-Eyebrow → «${eyebrow}»`)
    if (APPLY) {
      await payload.updateGlobal({
        slug: 'header',
        data: { stage: { ...(h.stage ?? {}), eyebrow } },
      })
    }
  }
}

// ── 3. Footer: die zweite falsche Hausnummer ─────────────────────────────
{
  const f = await payload.findGlobal({ slug: 'footer', depth: 0 })
  const adresse = f.contact?.address ?? ''

  if (adresse.includes('Steigstrasse 14')) {
    const neu = adresse.replace('Steigstrasse 14', 'Steigstrasse 12')
    console.log(`  ${tat}Footer-Adresse → Steigstrasse 12`)
    console.log('             Die Korrektur vom Vormittag fasste nur die Startseiten-Sektion an.')
    if (APPLY) {
      await payload.updateGlobal({
        slug: 'footer',
        data: { contact: { ...(f.contact ?? {}), address: neu } },
      })
    }
  } else {
    console.log('  vorhanden: Footer-Adresse korrekt')
  }
}

// ── 4. Catering: die fehlenden Regionen und «Privatkoch» ─────────────────
{
  const treffer = await payload.find({
    collection: 'angebote',
    where: { title: { equals: 'Catering' } },
    limit: 1,
    depth: 0,
  })
  const doc = treffer.docs[0]

  if (!doc) {
    console.log('  ! Angebot «Catering» nicht gefunden')
  } else {
    const beschreibung = JSON.parse(JSON.stringify(doc.description ?? {}))
    const alt = 'Graubünden & Bündner Herrschaft, St. Galler Rheintal, ganze Ostschweiz'
    const neu =
      'Bündner Herrschaft, Sarganserland und Werdenberg, dazu Graubünden und das ' +
      'St. Galler Rheintal — auch als Privatkoch für kleine Runden'

    const geaendert = ersetzeImText(beschreibung, alt, neu)

    // `features` ist eine Liste einfacher Texte und der natürliche Ort für das
    // Einsatzgebiet — es steht dort als Leistungsmerkmal, nicht als Füllwort.
    const merkmale = (doc.features ?? []).map((f) => ({ ...f }))
    const gebiet = 'Einsatzgebiet: Herrschaft, Sarganserland, Werdenberg, Graubünden, Rheintal'
    const hatGebiet = merkmale.some((f) => f.text?.includes('Einsatzgebiet'))

    if (!geaendert && hatGebiet) {
      console.log('  vorhanden: Catering-Regionen')
    } else {
      if (geaendert) console.log(`  ${tat}Catering-Text → Sarganserland, Werdenberg, Privatkoch`)
      if (!hatGebiet) {
        console.log(`  ${tat}Catering-Merkmal → «${gebiet}»`)
        merkmale.push({ text: gebiet, icon: null })
      }
      if (APPLY) {
        await payload.update({
          collection: 'angebote',
          id: doc.id,
          data: { description: beschreibung, features: merkmale },
        })
      }
    }
  }
}

// ── 5. Der Gourmetabend als Anlass ───────────────────────────────────────
const TITEL_ABEND = 'Gourmetabend im PINOT'
{
  const treffer = await payload.find({
    collection: 'events',
    where: { title: { equals: TITEL_ABEND } },
    limit: 1,
    depth: 0,
  })

  if (treffer.totalDocs > 0) {
    console.log('  vorhanden: Gourmetabend')
  } else {
    console.log(`  ${tat}Anlass → «${TITEL_ABEND}», jeden Donnerstag ab 18:00`)
    if (APPLY) {
      await payload.create({
        collection: 'events',
        data: {
          title: TITEL_ABEND,
          // Wie im Seed: Der Feld-Hook bildet den Slug zwar selbst, das
          // generierte Modell verlangt ihn aber — Payloads Typen kennen die
          // Hooks nicht.
          slug: slugify(TITEL_ABEND),
          rhythmus: 'woechentlich',
          wochentag: 'Thursday',
          zeit: '18:00',
          datum: '2025-01-09T00:00:00.000Z',
          eyebrow: 'Jede Woche neu',
          excerpt:
            'Der Abend, an dem die Küche zeigt, was die Woche hergibt: ein Menü aus dem, ' +
            'was gerade aus der Bündner Herrschaft und dem St. Galler Rheintal kommt. ' +
            'Es wechselt jede Woche — zweimal dasselbe gibt es nicht.',
          ort: 'Restaurant PINOT, Steigstrasse 12, 7306 Fläsch',
          cta: { label: 'Tisch reservieren', url: 'mailto:info@titz.cooking' },
          _status: 'published',
        },
      })
    }
  }
}

// ── 6. Die Anlässe-Sektion auf der Startseite ────────────────────────────
{
  const treffer = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
    depth: 0,
  })
  const seite = treffer.docs[0]

  if (!seite || !Array.isArray(seite.sections)) {
    console.log('  ! Startseite nicht gefunden')
  } else if (
    seite.sections.some((b) => (b as { blockType?: string }).blockType === 'eventsSection')
  ) {
    console.log('  vorhanden: Anlässe-Sektion')
  } else {
    // Direkt nach der Pinot-Sektion: Dort steht das Restaurant, und dort findet
    // der Abend statt. Vor dem Lebenslauf, weil ein Termin, den man wahrnehmen
    // kann, wichtiger ist als eine Laufbahn, die man nachliest.
    const nachBesuch =
      seite.sections.findIndex((b) => (b as { blockType?: string }).blockType === 'visitSection') +
      1
    const stelle = nachBesuch > 0 ? nachBesuch : seite.sections.length

    const block = {
      blockType: 'eventsSection',
      anchor: 'anlaesse',
      eyebrow: 'Anlässe',
      heading: 'Was als Nächstes ansteht.',
      intro:
        'Der Gourmetabend läuft jede Woche, dazu einzelne Termine. Reservieren lohnt sich — ' +
        'das PINOT hat wenige Plätze.',
      limit: 4,
    }

    console.log(`  ${tat}Anlässe-Sektion an Stelle ${stelle} von ${seite.sections.length}`)
    if (APPLY) {
      const neu = [...seite.sections]
      neu.splice(stelle, 0, block as never)
      await payload.update({ collection: 'pages', id: seite.id, data: { sections: neu } })
    }
  }
}

console.log(APPLY ? '\nGeschrieben.' : '\nNichts geschrieben.')

// Kein process.exit(): Der Rebuild-Hook setzt seinen Fetch im Hintergrund ab.
// Lokal ist WEB_DEPLOY_HOOK_URL leer, danach also `pnpm run deploy:web`.
