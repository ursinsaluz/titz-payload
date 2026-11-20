import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_blocks_instagram_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`anchor\` text DEFAULT 'instagram',
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`handle\` text DEFAULT '@titzsebastian',
  	\`profile_url\` text DEFAULT 'https://www.instagram.com/titzsebastian/',
  	\`limit\` numeric DEFAULT 4,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_instagram_section_order_idx\` ON \`pages_blocks_instagram_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_instagram_section_parent_id_idx\` ON \`pages_blocks_instagram_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_instagram_section_path_idx\` ON \`pages_blocks_instagram_section\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_instagram_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`anchor\` text DEFAULT 'instagram',
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`handle\` text DEFAULT '@titzsebastian',
  	\`profile_url\` text DEFAULT 'https://www.instagram.com/titzsebastian/',
  	\`limit\` numeric DEFAULT 4,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_instagram_section_order_idx\` ON \`_pages_v_blocks_instagram_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_instagram_section_parent_id_idx\` ON \`_pages_v_blocks_instagram_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_instagram_section_path_idx\` ON \`_pages_v_blocks_instagram_section\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`instagram_posts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`instagram_id\` text NOT NULL,
  	\`published_at\` text NOT NULL,
  	\`media_type\` text DEFAULT 'IMAGE' NOT NULL,
  	\`permalink\` text NOT NULL,
  	\`caption\` text NOT NULL,
  	\`image_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`instagram_posts_instagram_id_idx\` ON \`instagram_posts\` (\`instagram_id\`);`)
  await db.run(sql`CREATE INDEX \`instagram_posts_image_idx\` ON \`instagram_posts\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`instagram_posts_updated_at_idx\` ON \`instagram_posts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`instagram_posts_created_at_idx\` ON \`instagram_posts\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`instagram_posts_find\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`instagram_posts_create\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`instagram_posts_update\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`instagram_posts_delete\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`instagram_posts_id\` integer REFERENCES instagram_posts(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_instagram_posts_id_idx\` ON \`payload_locked_documents_rels\` (\`instagram_posts_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`pages_blocks_instagram_section\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_instagram_section\`;`)
  await db.run(sql`DROP TABLE \`instagram_posts\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	\`icons_id\` integer,
  	\`pages_id\` integer,
  	\`news_id\` integer,
  	\`events_id\` integer,
  	\`angebote_id\` integer,
  	\`signature_dishes_id\` integer,
  	\`stationen_id\` integer,
  	\`payload_mcp_api_keys_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`icons_id\`) REFERENCES \`icons\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`news_id\`) REFERENCES \`news\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`events_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`angebote_id\`) REFERENCES \`angebote\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`signature_dishes_id\`) REFERENCES \`signature_dishes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`stationen_id\`) REFERENCES \`stationen\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`payload_mcp_api_keys_id\`) REFERENCES \`payload_mcp_api_keys\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id", "icons_id", "pages_id", "news_id", "events_id", "angebote_id", "signature_dishes_id", "stationen_id", "payload_mcp_api_keys_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id", "icons_id", "pages_id", "news_id", "events_id", "angebote_id", "signature_dishes_id", "stationen_id", "payload_mcp_api_keys_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_icons_id_idx\` ON \`payload_locked_documents_rels\` (\`icons_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_news_id_idx\` ON \`payload_locked_documents_rels\` (\`news_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_events_id_idx\` ON \`payload_locked_documents_rels\` (\`events_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_angebote_id_idx\` ON \`payload_locked_documents_rels\` (\`angebote_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_signature_dishes_id_idx\` ON \`payload_locked_documents_rels\` (\`signature_dishes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_stationen_id_idx\` ON \`payload_locked_documents_rels\` (\`stationen_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_payload_mcp_api_keys_id_idx\` ON \`payload_locked_documents_rels\` (\`payload_mcp_api_keys_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`instagram_posts_find\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`instagram_posts_create\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`instagram_posts_update\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`instagram_posts_delete\`;`)
}
