import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`icons_toasts\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`icons\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`icons_toasts_order_idx\` ON \`icons_toasts\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`icons_toasts_parent_id_idx\` ON \`icons_toasts\` (\`_parent_id\`);`)
  await db.run(sql`ALTER TABLE \`site_settings\` ADD \`easter_eggs_completion_toast\` text;`)
  await db.run(sql`ALTER TABLE \`site_settings\` ADD \`easter_eggs_star_toast\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`icons_toasts\`;`)
  await db.run(sql`ALTER TABLE \`site_settings\` DROP COLUMN \`easter_eggs_completion_toast\`;`)
  await db.run(sql`ALTER TABLE \`site_settings\` DROP COLUMN \`easter_eggs_star_toast\`;`)
}
