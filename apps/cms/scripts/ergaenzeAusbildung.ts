/**
 * Ergänzt die Aus- und Weiterbildungen aus dem Lebenslauf von Sebastian Titz
 * in der Collection `stationen` (`group: 'ausbildung'`).
 *
 *   cd apps/cms
 *   NODE_ENV=production PAYLOAD_SECRET=ignore AUSBILDUNG_APPLY=1 \
 *     npx payload run scripts/ergaenzeAusbildung.ts
 */
import { getPayload } from 'payload'
import config from '@payload-config'

const APPLY = process.env.AUSBILDUNG_APPLY === '1'
const tat = APPLY ? 'schreiben: ' : 'würde:     '

const EINTRAEGE: {
  period: string
  title: string
  place?: string
  description?: string
  order: number
}[] = [
  {
    period: '2014 – 2016',
    title: 'Eidg. Dipl. Küchenchef (HFP)',
    place: 'Hotel & Gastro Formation Weggis',
    description:
      'Höhere Fachprüfung: Planungs-, Führungs-, Steuerungs-, Fach-, Kommunikations- und Informationsaufgaben als Küchenchef',
    order: 11,
  },
  {
    period: '2011 – 2012',
    title: 'Chefkoch mit eidg. Fachausweis',
    description:
      'Menüplanung, Lebensmittelbeschaffung, Lagerung, Zubereitung, Anrichten, Lebensmittelgesetzgebung und gesunde Ernährung',
    order: 12,
  },
  {
    period: '2004',
    title: 'Abverdienen Unteroffizier / Küchenchef',
    place: 'Infanterieschulen Aarau und Chur',
    order: 13,
  },
  {
    period: '2003',
    title: 'Unteroffiziersschule für Küchenchefs',
    place: 'Thun',
    description: 'Ausbildung zum militärischen Küchenchef',
    order: 14,
  },
  {
    period: '1999 – 2002',
    title: 'Kochlehre',
    place: 'Restaurant Schneggen, Buchs SG',
    description:
      '14 GaultMillau-Punkte — klassische französische Basisküche, verfeinert über Stationen in den besten Küchen Europas',
    order: 15,
  },
]

const payload = await getPayload({ config })

const bestehende = await payload.find({
  collection: 'stationen',
  where: { group: { equals: 'ausbildung' } },
  limit: 100,
  depth: 0,
})

for (const ziel of EINTRAEGE) {
  const vorhanden = bestehende.docs.find((d) => d.title === ziel.title)
  if (vorhanden) {
    const gleich =
      (vorhanden.period ?? null) === ziel.period &&
      (vorhanden.place ?? null) === (ziel.place ?? null) &&
      (vorhanden.description ?? null) === (ziel.description ?? null) &&
      vorhanden.order === ziel.order

    if (gleich) {
      console.log(`  vorhanden: ${ziel.period} · ${ziel.title}`)
      continue
    }

    console.log(
      `  ${tat}aktualisieren ${ziel.period} · ${ziel.title} (${ziel.place ?? 'ohne Ort'})`,
    )
    if (APPLY) {
      await payload.update({
        collection: 'stationen',
        id: vorhanden.id,
        data: {
          group: 'ausbildung',
          period: ziel.period,
          title: ziel.title,
          place: ziel.place ?? null,
          description: ziel.description ?? null,
          order: ziel.order,
        },
      })
    }
  } else {
    console.log(
      `  ${tat}neu anlegen   ${ziel.period} · ${ziel.title} (${ziel.place ?? 'ohne Ort'})`,
    )
    if (APPLY) {
      await payload.create({
        collection: 'stationen',
        data: {
          group: 'ausbildung',
          period: ziel.period,
          title: ziel.title,
          place: ziel.place ?? undefined,
          description: ziel.description ?? undefined,
          order: ziel.order,
        },
      })
    }
  }
}

// Hobbies dahinter sauber ab order 16 einreihen
const hobbies = await payload.find({
  collection: 'stationen',
  where: { group: { equals: 'hobbies' } },
  sort: 'order',
  limit: 100,
  depth: 0,
})

let hobbyOrder = 16
for (const hobby of hobbies.docs) {
  if (hobby.order !== hobbyOrder) {
    console.log(`  ${tat}Reihenfolge Hobby «${hobby.title}»: ${hobby.order} → ${hobbyOrder}`)
    if (APPLY) {
      await payload.update({
        collection: 'stationen',
        id: hobby.id,
        data: { order: hobbyOrder },
      })
    }
  }
  hobbyOrder++
}

console.log(APPLY ? '\nGeschrieben.' : '\nNichts geschrieben (AUSBILDUNG_APPLY=1 zum Schreiben).')
