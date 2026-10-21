import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

/**
 * Slug für Einträge unter «Aktuelles» (`news`).
 *
 * Vorher wurde die URL eigener Beiträge beim Astro-Build jedes Mal neu aus dem
 * Titel abgeleitet (`aktuellesSlug(title)`). Eine Titelkorrektur im Admin
 * änderte damit die Adresse unter `/aktuelles/<slug>/`. Jetzt liegt der Slug
 * wie bei `events` und `angebote` in der Datenbank und wird nach dem Anlegen
 * nicht mehr verändert.
 */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

type Zeile = { id: number; title: string | null }

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`news\` ADD \`slug\` text;`)
  await db.run(sql`ALTER TABLE \`_news_v\` ADD \`version_slug\` text;`)

  const zeilen = (await db.all(
    sql.raw('SELECT id, title FROM news ORDER BY id'),
  )) as Zeile[]

  const vergeben = new Set<string>()
  for (const zeile of zeilen) {
    const basis = slugify(zeile.title ?? '') || `aktuelles-${zeile.id}`
    let slug = basis
    for (let n = 2; vergeben.has(slug); n++) slug = `${basis}-${n}`
    vergeben.add(slug)

    await db.run(sql`UPDATE \`news\` SET \`slug\` = ${slug} WHERE id = ${zeile.id}`)
  }

  await db.run(sql`
    UPDATE \`_news_v\`
       SET \`version_slug\` = (SELECT \`slug\` FROM \`news\` WHERE \`news\`.\`id\` = \`_news_v\`.\`parent_id\`)
     WHERE \`version_slug\` IS NULL AND \`parent_id\` IS NOT NULL;
  `)

  await db.run(sql`CREATE UNIQUE INDEX \`news_slug_idx\` ON \`news\` (\`slug\`);`)
  await db.run(
    sql`CREATE INDEX \`_news_v_version_version_slug_idx\` ON \`_news_v\` (\`version_slug\`);`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`news_slug_idx\`;`)
  await db.run(sql`ALTER TABLE \`news\` DROP COLUMN \`slug\`;`)
  await db.run(sql`DROP INDEX \`_news_v_version_version_slug_idx\`;`)
  await db.run(sql`ALTER TABLE \`_news_v\` DROP COLUMN \`version_slug\`;`)
}
