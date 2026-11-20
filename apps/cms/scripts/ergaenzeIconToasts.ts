/**
 * Ergänzt die bestehenden Gemüse-Icons in der Collection `icons` um die
 * neuen Toast-Sprüche (behält vorhandene Sprüche bei und hängt fehlende an).
 *
 *   cd apps/cms
 *   NODE_ENV=production PAYLOAD_SECRET=ignore TOASTS_APPLY=1 \
 *     npx payload run scripts/ergaenzeIconToasts.ts
 */
import { getPayload } from 'payload'
import config from '@payload-config'

const APPLY = process.env.TOASTS_APPLY === '1'
const tat = APPLY ? 'schreiben: ' : 'würde:     '

const NEUE_TOASTS: Record<string, string[]> = {
  zwiebel: [
    'Die Zwiebel — das einzige Mise en Place, das zurückweint.',
    'Zwiebeln haben Schichten — wie Oger, oder Köche, die sind sogar sehr vielschichtig.',
    'Keine Tränen beim Brunoise-Schneiden? Die Macht ist stark in diesem.',
    'Zwiebel-Mirepoix ohne Chichi — aber wer sie verbrennt, hört Ezekiel 25,17.',
    'Keine Schalotte im Haus? Gusteau sagt, jeder kann kochen — nimm rote Zwiebel.',
  ],
  tomate: [
    'Drei Tomaten gehen durch die Küche. Eine trödelt beim Passieren — zack: Ketchup!',
    'Eine gute Tomatensauce reduziert so lange ein, bis ihr Umami unvermeidlich ist.',
    'Tomaten im tiefsten Winter kaufen? Ich finde Ihren Mangel an Saisonglauben beklagenswert.',
  ],
  spargel: [
    'Es ist vorbei, Spargel! Der Sparschäler steht deutlich über dir.',
    'Spargel mit Beurre blanc? Attendez la crème — gute Emulsion braucht Geduld.',
    'Spargelzeit in der Bündner Herrschaft: Wir lieben sie 3000 — aber nur bis Juni.',
  ],
  randen: [
    'Nach dem Randen-Schälen sehen die Hände aus wie nach einer Szene bei Tarantino.',
    'Randen im Ofen langsam rösten: Tu es oder tu es nicht — halbweich gibt es kein Versuchen.',
    'Warum meine Kochschürze pink ist? Das ist mein Geheimnis, Cap: Ich verarbeite Randen.',
  ],
  radieschen: [
    'Nach meiner Grösse beurteilst du mich? Klein, scharf und unterschätzt — genau wie Radieschen.',
    'Frische Radieschen, gutes Brot, etwas Salz und Fläscher Butter — das ist ein Bingo!',
    'Kurz in Eiswasser gelegt, knackt das Radieschen lauter als Colettes perfekte Brotkruste.',
  ],
  quitte: [
    'Roh steinhart, geschmort ein Gedicht — die Quitte ist der Bruce Banner unter den Früchten.',
    'Roh in eine frische Quitte gebissen? Beeindruckend, höchst beeindruckend — und mutig.',
    'Vergifteter Apfel unnötig: Eine rohe Quitte legt auch ohne böse Hexe jeden Kiefer lahm.',
  ],
  pilz: [
    'Einen unbekannten Waldpilz blind in die Pfanne werfen? Ich hab da ein ganz mieses Gefühl.',
    'Herbstlicher Steinpilz-Fond mit frischem Thymian — sagt man das so: «Das ist ein Bingo»?',
    'Für Steinpilze in heisser Nussbutter braucht es keine Macht — nur Timing und Respekt.',
  ],
  lauch: [
    'Das grüne Ende vom Lauch wegwerfen? Ich finde Ihren Mangel an Fond-Glauben beklagenswert.',
    'Lauch gründlich waschen? Du warst mein Bruder im Topf — aber Sand verzeiht kein Gast.',
    'Weisser Lauch ins Gemüse, sattes Grün ab in den Fond: So hält man den Posten im Gleichgewicht.',
  ],
  kuerbis: [
    'Um Mitternacht wird keine Kutsche draus, sondern eine Kürbissuppe mit Fläscher Safran-Note.',
    'Manches schmeckt vielleicht nach Kürbiskuchen — unser gerösteter Butternut schlägt aber alles.',
    'Ein Riesen-Kürbis auf dem Brett? Das ist kein Mond — das ist das ganze Herbstmenü.',
  ],
  kraeuter: [
    'Junge Rosmarinspitzen in die Beurre blanc: wenig Worte, volle Wucht — «Ich bin Groot» in Grün.',
    'Getrocknet gegen frisch vom PINOT-Beet? Du musst verlernen, was du über Lorbeer gelernt hast.',
    'Wilder Oregano von der Steinmauer, kalt gepresst — in Paris wäre das ein «Royale mit Kräuteröl».',
  ],
  kohl: [
    'Kohl sei langweilig? Unterschätze niemals die dunkle Seite kräftiger Röstaromen.',
    'Aus Weisskohl ein Sternemenü zaubern? Grosse Künstler werden eben auch auf dem Acker geboren.',
    'Langsam geschmort mit Kümmel und Geduld: «Ich kann das den ganzen Tag machen» — jeder Schmortopf.',
  ],
  knoblauch: [
    'Eine Zehe zu wenig im Ansatz? Wir reden hier von Knoblauch — nicht vom metrischen System.',
    'Knoblauch in zu heissem Öl verbrennen? Ich finde deinen Mangel an Geduld beklagenswert.',
    'Vampire haben in Fläsch Hausverbot, seit wir regionalen Bio-Knoblauchsenf im Glas haben.',
  ],
  karotte: [
    'Olaf hätte sie gern als Nase, wir werfen sie lieber direkt ins kräftige Rinderfond-Mirepoix.',
    'Eine krumme Bio-Karotte aussortieren? Nach meiner Form beurteilst du mich? Geschmack zählt.',
    'Glanz auf der Karotte braucht kühle Butter und Ruhe — genau wie ein kalt serviertes Gericht.',
  ],
  birne: [
    'Wenn süsse Birne auf reifen Käse trifft, zündet im Mund das kleine Ratatouille-Feuerwerk.',
    'Kein raffinierter Zucker, sondern regionales Birnell im Fläscher Senf — das ist der Weg.',
    'Pochierte Birne mit Rahm auf dem Pass? Genau der richtige Moment für «Attendez la crème!».',
  ],
  beeren: [
    'Pepper Potts ist gegen Erdbeeren allergisch — gut, dass unsere Beeren allein für dich sind.',
    'Aufgepasst beim Einkochen ohne Deckel: Die erste Spritzer-Beere auf der weissen Jacke ist eine Falle!',
    'Frische Beeren direkt vom Strauch naschen, statt alles zu passieren? Einmal kurz: Hakuna Matata.',
  ],
  baumnuss: [
    'Sobald die Baumnüsse in der Pfanne duften: «Diese Party ist vorbei!» — sofort raus auf kaltes Blech.',
    'Baumnuss-Pesto niemals heiss kochen — Rache und gute Nuss-Öl-Emulsion serviert man kalt.',
    'Leicht geröstet, fein gehackt: Eine Prise Baumnuss bringt jeden Teller ins perfekte Gleichgewicht.',
  ],
  apfel: [
    'Dieser Apfel kommt direkt vom Bündner Baum — ganz ohne Hexe, dafür zu Spekulatius-Eis.',
    'Apfelstrudel im PINOT? Vergiss die Zigarette — aber bitte unbedingt: «Attendez la crème!»',
    'Granny Smith statt Braeburn im Kompott? «Ich ändere den Deal. Betet, dass ich ihn nicht noch weiter ändere.»',
  ],
  ananas: [
    "Wer wohnt in 'ner Ananas ganz tief im Meer? Egal — bei uns landet sie scharf gegrillt auf dem Teller.",
    'Rohe Ananas in Gelatine? Bromelain sagt «Ich bin unvermeidlich» — vorher immer kurz aufkochen!',
    'Ein Big Kahuna Burger braucht gegrillte Ananas — und ja, das ist ein verdammt leckerer Burger.',
  ],
}

const payload = await getPayload({ config })

const alleIcons = await payload.find({
  collection: 'icons',
  limit: 100,
  depth: 0,
})

for (const [name, sprueche] of Object.entries(NEUE_TOASTS)) {
  const icon = alleIcons.docs.find((d) => d.name === name)
  if (!icon) {
    console.warn(`  fehlt in DB: ${name}`)
    continue
  }

  const vorhandene = (icon.toasts ?? []).map((t) => t.text.trim())
  const zusammen = [...vorhandene]
  let neuHinzugefuegt = 0

  for (const spruch of sprueche) {
    const bereinigt = spruch.trim()
    if (!zusammen.includes(bereinigt)) {
      zusammen.push(bereinigt)
      neuHinzugefuegt++
    }
  }

  if (neuHinzugefuegt === 0) {
    console.log(`  unverändert: ${name} (${zusammen.length} Sprüche)`)
    continue
  }

  console.log(
    `  ${tat}${name} (${vorhandene.length} → ${zusammen.length} Sprüche, +${neuHinzugefuegt})`,
  )

  if (APPLY) {
    await payload.update({
      collection: 'icons',
      id: icon.id,
      data: {
        toasts: zusammen.map((text) => ({ text })),
      },
    })
  }
}

console.log(APPLY ? '\nGeschrieben.' : '\nNichts geschrieben (TOASTS_APPLY=1 zum Schreiben).')
