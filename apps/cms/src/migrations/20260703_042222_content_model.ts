import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`icons\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`svg\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`icons_name_idx\` ON \`icons\` (\`name\`);`)
  await db.run(sql`CREATE INDEX \`icons_updated_at_idx\` ON \`icons\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`icons_created_at_idx\` ON \`icons\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`icons_filename_idx\` ON \`icons\` (\`filename\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_philosophie_values\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`icon_id\` integer,
  	\`title\` text,
  	\`text\` text,
  	FOREIGN KEY (\`icon_id\`) REFERENCES \`icons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_philosophie\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_philosophie_values_order_idx\` ON \`pages_blocks_philosophie_values\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_philosophie_values_parent_id_idx\` ON \`pages_blocks_philosophie_values\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_philosophie_values_icon_idx\` ON \`pages_blocks_philosophie_values\` (\`icon_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_philosophie\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`anchor\` text DEFAULT 'philosophie',
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`body\` text,
  	\`quote\` text,
  	\`quote_source\` text,
  	\`image_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_philosophie_order_idx\` ON \`pages_blocks_philosophie\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_philosophie_parent_id_idx\` ON \`pages_blocks_philosophie\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_philosophie_path_idx\` ON \`pages_blocks_philosophie\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_philosophie_image_idx\` ON \`pages_blocks_philosophie\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_angebote_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`anchor\` text DEFAULT 'angebote',
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`intro\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_angebote_section_order_idx\` ON \`pages_blocks_angebote_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_angebote_section_parent_id_idx\` ON \`pages_blocks_angebote_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_angebote_section_path_idx\` ON \`pages_blocks_angebote_section\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_news_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`anchor\` text DEFAULT 'aktuelles',
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`limit\` numeric DEFAULT 3,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_news_section_order_idx\` ON \`pages_blocks_news_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_news_section_parent_id_idx\` ON \`pages_blocks_news_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_news_section_path_idx\` ON \`pages_blocks_news_section\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_signature_dishes_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`anchor\` text DEFAULT 'signature-dishes',
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`intro\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_signature_dishes_section_order_idx\` ON \`pages_blocks_signature_dishes_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_signature_dishes_section_parent_id_idx\` ON \`pages_blocks_signature_dishes_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_signature_dishes_section_path_idx\` ON \`pages_blocks_signature_dishes_section\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_stationen_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`anchor\` text DEFAULT 'stationen',
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`intro\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_stationen_section_order_idx\` ON \`pages_blocks_stationen_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_stationen_section_parent_id_idx\` ON \`pages_blocks_stationen_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_stationen_section_path_idx\` ON \`pages_blocks_stationen_section\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_visit_section_infos\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`icon_id\` integer,
  	\`label\` text,
  	\`value\` text,
  	\`url\` text,
  	FOREIGN KEY (\`icon_id\`) REFERENCES \`icons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_visit_section\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_visit_section_infos_order_idx\` ON \`pages_blocks_visit_section_infos\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_visit_section_infos_parent_id_idx\` ON \`pages_blocks_visit_section_infos\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_visit_section_infos_icon_idx\` ON \`pages_blocks_visit_section_infos\` (\`icon_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_visit_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`anchor\` text DEFAULT 'kontakt',
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`body\` text,
  	\`image_id\` integer,
  	\`map_embed_url\` text,
  	\`cta_label\` text,
  	\`cta_url\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_visit_section_order_idx\` ON \`pages_blocks_visit_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_visit_section_parent_id_idx\` ON \`pages_blocks_visit_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_visit_section_path_idx\` ON \`pages_blocks_visit_section\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_visit_section_image_idx\` ON \`pages_blocks_visit_section\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_rich_text_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`anchor\` text,
  	\`heading\` text,
  	\`body\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_rich_text_section_order_idx\` ON \`pages_blocks_rich_text_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_rich_text_section_parent_id_idx\` ON \`pages_blocks_rich_text_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_rich_text_section_path_idx\` ON \`pages_blocks_rich_text_section\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`slug\` text,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_image_id\` integer,
  	\`seo_no_index\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`seo_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_slug_idx\` ON \`pages\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`pages_seo_seo_image_idx\` ON \`pages\` (\`seo_image_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_updated_at_idx\` ON \`pages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`pages_created_at_idx\` ON \`pages\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`pages__status_idx\` ON \`pages\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`pages_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`angebote_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`angebote_id\`) REFERENCES \`angebote\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_rels_order_idx\` ON \`pages_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`pages_rels_parent_idx\` ON \`pages_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_rels_path_idx\` ON \`pages_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`pages_rels_angebote_id_idx\` ON \`pages_rels\` (\`angebote_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_philosophie_values\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`icon_id\` integer,
  	\`title\` text,
  	\`text\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`icon_id\`) REFERENCES \`icons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_philosophie\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_philosophie_values_order_idx\` ON \`_pages_v_blocks_philosophie_values\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_philosophie_values_parent_id_idx\` ON \`_pages_v_blocks_philosophie_values\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_philosophie_values_icon_idx\` ON \`_pages_v_blocks_philosophie_values\` (\`icon_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_philosophie\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`anchor\` text DEFAULT 'philosophie',
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`body\` text,
  	\`quote\` text,
  	\`quote_source\` text,
  	\`image_id\` integer,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_philosophie_order_idx\` ON \`_pages_v_blocks_philosophie\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_philosophie_parent_id_idx\` ON \`_pages_v_blocks_philosophie\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_philosophie_path_idx\` ON \`_pages_v_blocks_philosophie\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_philosophie_image_idx\` ON \`_pages_v_blocks_philosophie\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_angebote_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`anchor\` text DEFAULT 'angebote',
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`intro\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_angebote_section_order_idx\` ON \`_pages_v_blocks_angebote_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_angebote_section_parent_id_idx\` ON \`_pages_v_blocks_angebote_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_angebote_section_path_idx\` ON \`_pages_v_blocks_angebote_section\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_news_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`anchor\` text DEFAULT 'aktuelles',
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`limit\` numeric DEFAULT 3,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_news_section_order_idx\` ON \`_pages_v_blocks_news_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_news_section_parent_id_idx\` ON \`_pages_v_blocks_news_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_news_section_path_idx\` ON \`_pages_v_blocks_news_section\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_signature_dishes_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`anchor\` text DEFAULT 'signature-dishes',
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`intro\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_signature_dishes_section_order_idx\` ON \`_pages_v_blocks_signature_dishes_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_signature_dishes_section_parent_id_idx\` ON \`_pages_v_blocks_signature_dishes_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_signature_dishes_section_path_idx\` ON \`_pages_v_blocks_signature_dishes_section\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_stationen_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`anchor\` text DEFAULT 'stationen',
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`intro\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_stationen_section_order_idx\` ON \`_pages_v_blocks_stationen_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_stationen_section_parent_id_idx\` ON \`_pages_v_blocks_stationen_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_stationen_section_path_idx\` ON \`_pages_v_blocks_stationen_section\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_visit_section_infos\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`icon_id\` integer,
  	\`label\` text,
  	\`value\` text,
  	\`url\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`icon_id\`) REFERENCES \`icons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_visit_section\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_visit_section_infos_order_idx\` ON \`_pages_v_blocks_visit_section_infos\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_visit_section_infos_parent_id_idx\` ON \`_pages_v_blocks_visit_section_infos\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_visit_section_infos_icon_idx\` ON \`_pages_v_blocks_visit_section_infos\` (\`icon_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_visit_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`anchor\` text DEFAULT 'kontakt',
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`body\` text,
  	\`image_id\` integer,
  	\`map_embed_url\` text,
  	\`cta_label\` text,
  	\`cta_url\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_visit_section_order_idx\` ON \`_pages_v_blocks_visit_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_visit_section_parent_id_idx\` ON \`_pages_v_blocks_visit_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_visit_section_path_idx\` ON \`_pages_v_blocks_visit_section\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_visit_section_image_idx\` ON \`_pages_v_blocks_visit_section\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_rich_text_section\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`anchor\` text,
  	\`heading\` text,
  	\`body\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_rich_text_section_order_idx\` ON \`_pages_v_blocks_rich_text_section\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_rich_text_section_parent_id_idx\` ON \`_pages_v_blocks_rich_text_section\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_rich_text_section_path_idx\` ON \`_pages_v_blocks_rich_text_section\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_slug\` text,
  	\`version_seo_title\` text,
  	\`version_seo_description\` text,
  	\`version_seo_image_id\` integer,
  	\`version_seo_no_index\` integer DEFAULT false,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_seo_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_parent_idx\` ON \`_pages_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_slug_idx\` ON \`_pages_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_seo_version_seo_image_idx\` ON \`_pages_v\` (\`version_seo_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_updated_at_idx\` ON \`_pages_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_created_at_idx\` ON \`_pages_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version__status_idx\` ON \`_pages_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_created_at_idx\` ON \`_pages_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_updated_at_idx\` ON \`_pages_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_latest_idx\` ON \`_pages_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`angebote_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`angebote_id\`) REFERENCES \`angebote\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_rels_order_idx\` ON \`_pages_v_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_rels_parent_idx\` ON \`_pages_v_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_rels_path_idx\` ON \`_pages_v_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_rels_angebote_id_idx\` ON \`_pages_v_rels\` (\`angebote_id\`);`)
  await db.run(sql`CREATE TABLE \`news\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`date\` text,
  	\`badge\` text,
  	\`excerpt\` text,
  	\`body\` text,
  	\`image_id\` integer,
  	\`link_label\` text,
  	\`link_url\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`news_image_idx\` ON \`news\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`news_updated_at_idx\` ON \`news\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`news_created_at_idx\` ON \`news\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`news__status_idx\` ON \`news\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_news_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_date\` text,
  	\`version_badge\` text,
  	\`version_excerpt\` text,
  	\`version_body\` text,
  	\`version_image_id\` integer,
  	\`version_link_label\` text,
  	\`version_link_url\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`news\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_news_v_parent_idx\` ON \`_news_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_version_version_image_idx\` ON \`_news_v\` (\`version_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_version_version_updated_at_idx\` ON \`_news_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_version_version_created_at_idx\` ON \`_news_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_version_version__status_idx\` ON \`_news_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_created_at_idx\` ON \`_news_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_updated_at_idx\` ON \`_news_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_news_v_latest_idx\` ON \`_news_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`angebote_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`icon_id\` integer,
  	\`text\` text NOT NULL,
  	FOREIGN KEY (\`icon_id\`) REFERENCES \`icons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`angebote\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`angebote_features_order_idx\` ON \`angebote_features\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`angebote_features_parent_id_idx\` ON \`angebote_features\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`angebote_features_icon_idx\` ON \`angebote_features\` (\`icon_id\`);`)
  await db.run(sql`CREATE TABLE \`angebote\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`eyebrow\` text,
  	\`icon_id\` integer,
  	\`description\` text,
  	\`image_id\` integer,
  	\`cta_label\` text,
  	\`cta_url\` text,
  	\`order\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`icon_id\`) REFERENCES \`icons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`angebote_icon_idx\` ON \`angebote\` (\`icon_id\`);`)
  await db.run(sql`CREATE INDEX \`angebote_image_idx\` ON \`angebote\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`angebote_updated_at_idx\` ON \`angebote\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`angebote_created_at_idx\` ON \`angebote\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`signature_dishes\` (
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
  await db.run(sql`CREATE INDEX \`signature_dishes_image_idx\` ON \`signature_dishes\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`signature_dishes_updated_at_idx\` ON \`signature_dishes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`signature_dishes_created_at_idx\` ON \`signature_dishes\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`stationen_highlights\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`icon_id\` integer,
  	\`text\` text NOT NULL,
  	FOREIGN KEY (\`icon_id\`) REFERENCES \`icons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`stationen\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`stationen_highlights_order_idx\` ON \`stationen_highlights\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`stationen_highlights_parent_id_idx\` ON \`stationen_highlights\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`stationen_highlights_icon_idx\` ON \`stationen_highlights\` (\`icon_id\`);`)
  await db.run(sql`CREATE TABLE \`stationen\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`group\` text DEFAULT 'stationen' NOT NULL,
  	\`period\` text,
  	\`title\` text NOT NULL,
  	\`place\` text,
  	\`description\` text,
  	\`icon_id\` integer,
  	\`image_id\` integer,
  	\`order\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`icon_id\`) REFERENCES \`icons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`stationen_icon_idx\` ON \`stationen\` (\`icon_id\`);`)
  await db.run(sql`CREATE INDEX \`stationen_image_idx\` ON \`stationen\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`stationen_updated_at_idx\` ON \`stationen\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`stationen_created_at_idx\` ON \`stationen\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`CREATE TABLE \`header_nav\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`link_type\` text DEFAULT 'anchor',
  	\`anchor\` text,
  	\`page_id\` integer,
  	\`url\` text,
  	\`new_tab\` integer DEFAULT false,
  	FOREIGN KEY (\`page_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`header\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`header_nav_order_idx\` ON \`header_nav\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`header_nav_parent_id_idx\` ON \`header_nav\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`header_nav_page_idx\` ON \`header_nav\` (\`page_id\`);`)
  await db.run(sql`CREATE TABLE \`header_stage_badges\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`icon_id\` integer,
  	\`label\` text NOT NULL,
  	FOREIGN KEY (\`icon_id\`) REFERENCES \`icons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`header\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`header_stage_badges_order_idx\` ON \`header_stage_badges\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`header_stage_badges_parent_id_idx\` ON \`header_stage_badges\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`header_stage_badges_icon_idx\` ON \`header_stage_badges\` (\`icon_id\`);`)
  await db.run(sql`CREATE TABLE \`header\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`logo_text\` text DEFAULT 'Sebastian Titz',
  	\`logo_image_id\` integer,
  	\`cta_label\` text,
  	\`cta_url\` text,
  	\`cta_icon_id\` integer,
  	\`stage_eyebrow\` text,
  	\`stage_headline\` text NOT NULL,
  	\`stage_subline\` text,
  	\`stage_image_id\` integer,
  	\`stage_video_url\` text,
  	\`stage_primary_cta_label\` text,
  	\`stage_primary_cta_url\` text,
  	\`stage_secondary_cta_label\` text,
  	\`stage_secondary_cta_url\` text,
  	\`stage_scroll_hint\` text,
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`logo_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`cta_icon_id\`) REFERENCES \`icons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`stage_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`header_logo_logo_image_idx\` ON \`header\` (\`logo_image_id\`);`)
  await db.run(sql`CREATE INDEX \`header_cta_cta_icon_idx\` ON \`header\` (\`cta_icon_id\`);`)
  await db.run(sql`CREATE INDEX \`header_stage_stage_image_idx\` ON \`header\` (\`stage_image_id\`);`)
  await db.run(sql`CREATE TABLE \`footer_columns_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`link_type\` text DEFAULT 'anchor',
  	\`anchor\` text,
  	\`page_id\` integer,
  	\`url\` text,
  	\`new_tab\` integer DEFAULT false,
  	FOREIGN KEY (\`page_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`footer_columns\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`footer_columns_links_order_idx\` ON \`footer_columns_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`footer_columns_links_parent_id_idx\` ON \`footer_columns_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`footer_columns_links_page_idx\` ON \`footer_columns_links\` (\`page_id\`);`)
  await db.run(sql`CREATE TABLE \`footer_columns\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`footer\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`footer_columns_order_idx\` ON \`footer_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`footer_columns_parent_id_idx\` ON \`footer_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`footer_socials\` (
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
  await db.run(sql`CREATE INDEX \`footer_socials_order_idx\` ON \`footer_socials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`footer_socials_parent_id_idx\` ON \`footer_socials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`footer_socials_icon_idx\` ON \`footer_socials\` (\`icon_id\`);`)
  await db.run(sql`CREATE TABLE \`footer_legal_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`link_type\` text DEFAULT 'anchor',
  	\`anchor\` text,
  	\`page_id\` integer,
  	\`url\` text,
  	\`new_tab\` integer DEFAULT false,
  	FOREIGN KEY (\`page_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`footer\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`footer_legal_links_order_idx\` ON \`footer_legal_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`footer_legal_links_parent_id_idx\` ON \`footer_legal_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`footer_legal_links_page_idx\` ON \`footer_legal_links\` (\`page_id\`);`)
  await db.run(sql`CREATE TABLE \`footer\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`about\` text,
  	\`contact_address\` text,
  	\`contact_phone\` text,
  	\`contact_email\` text,
  	\`copyright\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`CREATE TABLE \`site_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`site_name\` text DEFAULT 'Sebastian Titz' NOT NULL,
  	\`domain\` text DEFAULT 'https://titz.cooking',
  	\`default_seo_title\` text,
  	\`default_seo_title_template\` text,
  	\`default_seo_description\` text,
  	\`default_seo_image_id\` integer,
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`default_seo_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`site_settings_default_seo_default_seo_image_idx\` ON \`site_settings\` (\`default_seo_image_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`icons_id\` integer REFERENCES icons(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`pages_id\` integer REFERENCES pages(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`news_id\` integer REFERENCES news(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`angebote_id\` integer REFERENCES angebote(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`signature_dishes_id\` integer REFERENCES signature_dishes(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`stationen_id\` integer REFERENCES stationen(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_icons_id_idx\` ON \`payload_locked_documents_rels\` (\`icons_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_news_id_idx\` ON \`payload_locked_documents_rels\` (\`news_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_angebote_id_idx\` ON \`payload_locked_documents_rels\` (\`angebote_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_signature_dishes_id_idx\` ON \`payload_locked_documents_rels\` (\`signature_dishes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_stationen_id_idx\` ON \`payload_locked_documents_rels\` (\`stationen_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`icons\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_philosophie_values\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_philosophie\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_angebote_section\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_news_section\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_signature_dishes_section\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_stationen_section\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_visit_section_infos\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_visit_section\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_rich_text_section\`;`)
  await db.run(sql`DROP TABLE \`pages\`;`)
  await db.run(sql`DROP TABLE \`pages_rels\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_philosophie_values\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_philosophie\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_angebote_section\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_news_section\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_signature_dishes_section\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_stationen_section\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_visit_section_infos\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_visit_section\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_rich_text_section\`;`)
  await db.run(sql`DROP TABLE \`_pages_v\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_rels\`;`)
  await db.run(sql`DROP TABLE \`news\`;`)
  await db.run(sql`DROP TABLE \`_news_v\`;`)
  await db.run(sql`DROP TABLE \`angebote_features\`;`)
  await db.run(sql`DROP TABLE \`angebote\`;`)
  await db.run(sql`DROP TABLE \`signature_dishes\`;`)
  await db.run(sql`DROP TABLE \`stationen_highlights\`;`)
  await db.run(sql`DROP TABLE \`stationen\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`header_nav\`;`)
  await db.run(sql`DROP TABLE \`header_stage_badges\`;`)
  await db.run(sql`DROP TABLE \`header\`;`)
  await db.run(sql`DROP TABLE \`footer_columns_links\`;`)
  await db.run(sql`DROP TABLE \`footer_columns\`;`)
  await db.run(sql`DROP TABLE \`footer_socials\`;`)
  await db.run(sql`DROP TABLE \`footer_legal_links\`;`)
  await db.run(sql`DROP TABLE \`footer\`;`)
  await db.run(sql`DROP TABLE \`site_settings\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
}
