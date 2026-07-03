import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`pages_blocks_visit_section\` ADD \`secondary_cta_label\` text;`)
  await db.run(sql`ALTER TABLE \`pages_blocks_visit_section\` ADD \`secondary_cta_url\` text;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_visit_section\` ADD \`secondary_cta_label\` text;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_visit_section\` ADD \`secondary_cta_url\` text;`)
  await db.run(sql`ALTER TABLE \`signature_dishes\` ADD \`tag\` text;`)
  await db.run(sql`ALTER TABLE \`signature_dishes\` ADD \`icon_id\` integer REFERENCES icons(id);`)
  await db.run(sql`CREATE INDEX \`signature_dishes_icon_idx\` ON \`signature_dishes\` (\`icon_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_signature_dishes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`description\` text,
  	\`image_id\` integer,
  	\`video_url\` text,
  	\`order\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_signature_dishes\`("id", "name", "description", "image_id", "video_url", "order", "updated_at", "created_at") SELECT "id", "name", "description", "image_id", "video_url", "order", "updated_at", "created_at" FROM \`signature_dishes\`;`)
  await db.run(sql`DROP TABLE \`signature_dishes\`;`)
  await db.run(sql`ALTER TABLE \`__new_signature_dishes\` RENAME TO \`signature_dishes\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`signature_dishes_image_idx\` ON \`signature_dishes\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`signature_dishes_updated_at_idx\` ON \`signature_dishes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`signature_dishes_created_at_idx\` ON \`signature_dishes\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`pages_blocks_visit_section\` DROP COLUMN \`secondary_cta_label\`;`)
  await db.run(sql`ALTER TABLE \`pages_blocks_visit_section\` DROP COLUMN \`secondary_cta_url\`;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_visit_section\` DROP COLUMN \`secondary_cta_label\`;`)
  await db.run(sql`ALTER TABLE \`_pages_v_blocks_visit_section\` DROP COLUMN \`secondary_cta_url\`;`)
}
