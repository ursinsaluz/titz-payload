import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`media\` ADD \`kategorie\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`hobby\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`caption\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`jahr\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`verwendung\` text DEFAULT 'web';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`kategorie\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`hobby\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`caption\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`jahr\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`verwendung\`;`)
}
