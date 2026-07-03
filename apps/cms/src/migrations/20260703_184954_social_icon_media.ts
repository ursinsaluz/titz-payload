import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_footer_socials\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`icon_id\` integer,
  	\`label\` text NOT NULL,
  	\`url\` text NOT NULL,
  	FOREIGN KEY (\`icon_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`footer\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_footer_socials\`("_order", "_parent_id", "id", "icon_id", "label", "url") SELECT "_order", "_parent_id", "id", "icon_id", "label", "url" FROM \`footer_socials\`;`)
  await db.run(sql`DROP TABLE \`footer_socials\`;`)
  await db.run(sql`ALTER TABLE \`__new_footer_socials\` RENAME TO \`footer_socials\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`footer_socials_order_idx\` ON \`footer_socials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`footer_socials_parent_id_idx\` ON \`footer_socials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`footer_socials_icon_idx\` ON \`footer_socials\` (\`icon_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_footer_socials\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`icon_id\` integer NOT NULL,
  	\`label\` text NOT NULL,
  	\`url\` text NOT NULL,
  	FOREIGN KEY (\`icon_id\`) REFERENCES \`icons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`footer\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_footer_socials\`("_order", "_parent_id", "id", "icon_id", "label", "url") SELECT "_order", "_parent_id", "id", "icon_id", "label", "url" FROM \`footer_socials\`;`)
  await db.run(sql`DROP TABLE \`footer_socials\`;`)
  await db.run(sql`ALTER TABLE \`__new_footer_socials\` RENAME TO \`footer_socials\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`footer_socials_order_idx\` ON \`footer_socials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`footer_socials_parent_id_idx\` ON \`footer_socials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`footer_socials_icon_idx\` ON \`footer_socials\` (\`icon_id\`);`)
}
