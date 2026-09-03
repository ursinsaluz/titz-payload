import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

/**
 * Slug und SEO-Gruppe für Anlässe und Angebote.
 *
 * Damit bekommen beide Sammlungen eigene Adressen — `/anlaesse/<slug>` und
 * `/angebote/<slug>`. Vorher lag der ganze redaktionelle Inhalt als Anker auf
 * der Startseite, und ein einziges Dokument bewarb sich um Suchanfragen, die
 * nichts miteinander zu tun haben.
 *
 * **Diese Datei ist von Hand nachbearbeitet.** `payload migrate:create` hatte
 * zwei Dinge erzeugt, die gegen Produktion gescheitert wären:
 *
 * 1. `ALTER TABLE angebote ADD slug text NOT NULL;` — SQLite kann einer Tabelle
 *    mit Zeilen keine NOT-NULL-Spalte ohne Default hinzufügen und antwortet mit
 *    «Cannot add a NOT NULL column with default value NULL». In `angebote`
 *    stehen zwei Zeilen. `DEFAULT ''` löst das, ohne dass die Tabelle neu
 *    gebaut werden muss — und der Snapshot bleibt zufrieden, weil die Spalte
 *    danach wie erwartet NOT NULL ist. Die leeren Werte überschreibt der
 *    Backfill unten sofort.
 *
 * 2. Die Unique-Indizes standen **vor** dem Backfill. In `events` wäre das
 *    durchgegangen (SQLite lässt mehrere NULL in einem Unique-Index zu), in
 *    `angebote` mit zwei leeren Strings nicht. Sie stehen jetzt am Schluss —
 *    dort brechen sie auch dann sauber ab, wenn zwei Titel denselben Slug
 *    ergeben, statt später beim ersten Speichern im Admin.
 *
 * Der Backfill leitet den Slug aus dem Titel ab, nicht aus einer Liste
 * bekannter IDs: Die Migration muss auch gegen eine frisch geseedete oder
 * wiederhergestellte Datenbank laufen. Die Regel ist dieselbe wie in
 * `src/fields/slugFeld.ts`, hier bewusst noch einmal ausgeschrieben — eine
 * Migration darf sich nicht mit dem Anwendungscode mitverändern.
 */

/** «Gourmetabend im PINOT» → «gourmetabend-im-pinot». Kopie aus slugFeld.ts. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

type Zeile = { id: number; title: string | null }

/**
 * Füllt eine Spalte mit Slugs aus einer Titelspalte.
 *
 * Die Eindeutigkeit wird hier gebildet und nicht der Datenbank überlassen:
 * Zwei Anlässe «Gourmetabend» bekämen sonst denselben Slug, und der
 * Unique-Index am Ende bräche die Migration ab, nachdem sie schon Spalten
 * angelegt hat.
 */
async function backfill(
  db: MigrateUpArgs['db'],
  tabelle: string,
  titelSpalte: string,
  slugSpalte: string,
  ersatz: string,
): Promise<void> {
  // `db.all` und nicht `db.run`: Auf D1 gibt `run` ein `D1Result` mit
  // `results` zurück, nicht das `rows`, das die Payload-Dokumentation zeigt —
  // die stammt vom better-sqlite3-Adapter. `all` liefert direkt die Zeilen und
  // ist über beide Adapter gleich.
  const zeilen = (await db.all(
    sql.raw(`SELECT id, ${titelSpalte} AS title FROM ${tabelle} ORDER BY id`),
  )) as Zeile[]

  const vergeben = new Set<string>()

  for (const zeile of zeilen) {
    const basis = slugify(zeile.title ?? '') || `${ersatz}-${zeile.id}`
    let slug = basis
    for (let n = 2; vergeben.has(slug); n++) slug = `${basis}-${n}`
    vergeben.add(slug)

    // Tabellen- und Spaltenname über `sql.raw`, der Wert als gebundener
    // Parameter — ein Titel mit Apostroph («Chef's Table») würde sonst das
    // SQL zerlegen.
    await db.run(
      sql`UPDATE ${sql.raw(tabelle)} SET ${sql.raw(slugSpalte)} = ${slug} WHERE id = ${zeile.id}`,
    )
  }
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // --- Spalten: alle nullable oder mit Default, also reines ADD COLUMN ---
  await db.run(sql`ALTER TABLE \`events\` ADD \`slug\` text;`)
  await db.run(sql`ALTER TABLE \`events\` ADD \`seo_title\` text;`)
  await db.run(sql`ALTER TABLE \`events\` ADD \`seo_description\` text;`)
  await db.run(sql`ALTER TABLE \`events\` ADD \`seo_image_id\` integer REFERENCES media(id);`)
  await db.run(sql`ALTER TABLE \`events\` ADD \`seo_no_index\` integer DEFAULT false;`)

  await db.run(sql`ALTER TABLE \`_events_v\` ADD \`version_slug\` text;`)
  await db.run(sql`ALTER TABLE \`_events_v\` ADD \`version_seo_title\` text;`)
  await db.run(sql`ALTER TABLE \`_events_v\` ADD \`version_seo_description\` text;`)
  await db.run(
    sql`ALTER TABLE \`_events_v\` ADD \`version_seo_image_id\` integer REFERENCES media(id);`,
  )
  await db.run(sql`ALTER TABLE \`_events_v\` ADD \`version_seo_no_index\` integer DEFAULT false;`)

  // `DEFAULT ''` statt blossem NOT NULL — siehe Punkt 1 im Dateikopf.
  await db.run(sql`ALTER TABLE \`angebote\` ADD \`slug\` text DEFAULT '' NOT NULL;`)
  await db.run(sql`ALTER TABLE \`angebote\` ADD \`seo_title\` text;`)
  await db.run(sql`ALTER TABLE \`angebote\` ADD \`seo_description\` text;`)
  await db.run(sql`ALTER TABLE \`angebote\` ADD \`seo_image_id\` integer REFERENCES media(id);`)
  await db.run(sql`ALTER TABLE \`angebote\` ADD \`seo_no_index\` integer DEFAULT false;`)

  // --- Backfill vor den Unique-Indizes ---
  await backfill(db, 'events', 'title', 'slug', 'anlass')
  await backfill(db, 'angebote', 'title', 'slug', 'angebot')

  // Die Versionszeilen tragen den Slug ihres Elterndatensatzes. Ohne das
  // stünde im Admin bei jedem Entwurf ein leeres Slug-Feld.
  await db.run(sql`
    UPDATE \`_events_v\`
       SET \`version_slug\` = (SELECT \`slug\` FROM \`events\` WHERE \`events\`.\`id\` = \`_events_v\`.\`parent_id\`)
     WHERE \`version_slug\` IS NULL AND \`parent_id\` IS NOT NULL;
  `)

  // --- Indizes zuletzt ---
  await db.run(sql`CREATE UNIQUE INDEX \`events_slug_idx\` ON \`events\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`events_seo_seo_image_idx\` ON \`events\` (\`seo_image_id\`);`)
  await db.run(
    sql`CREATE INDEX \`_events_v_version_version_slug_idx\` ON \`_events_v\` (\`version_slug\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`_events_v_version_seo_version_seo_image_idx\` ON \`_events_v\` (\`version_seo_image_id\`);`,
  )
  await db.run(sql`CREATE UNIQUE INDEX \`angebote_slug_idx\` ON \`angebote\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`angebote_seo_seo_image_idx\` ON \`angebote\` (\`seo_image_id\`);`)
}

/**
 * Zurück geht nur über einen Tabellenneubau — SQLite kann keine Spalte
 * entfernen, solange ein Index darauf liegt, und `DROP COLUMN` kennt der
 * Adapter hier nicht. Das ist die von `migrate:create` erzeugte Fassung,
 * unverändert: Sie baut die drei Tabellen ohne die neuen Spalten neu.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_events\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`rhythmus\` text DEFAULT 'einmalig',
  	\`wochentag\` text,
  	\`datum\` text,
  	\`zeit\` text,
  	\`eyebrow\` text,
  	\`icon_id\` integer,
  	\`excerpt\` text,
  	\`body\` text,
  	\`preis\` text,
  	\`ort\` text DEFAULT 'Restaurant PINOT, Steigstrasse 12, 7306 Fläsch',
  	\`image_id\` integer,
  	\`cta_label\` text,
  	\`cta_url\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`icon_id\`) REFERENCES \`icons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_events\`("id", "title", "rhythmus", "wochentag", "datum", "zeit", "eyebrow", "icon_id", "excerpt", "body", "preis", "ort", "image_id", "cta_label", "cta_url", "updated_at", "created_at", "_status") SELECT "id", "title", "rhythmus", "wochentag", "datum", "zeit", "eyebrow", "icon_id", "excerpt", "body", "preis", "ort", "image_id", "cta_label", "cta_url", "updated_at", "created_at", "_status" FROM \`events\`;`)
  await db.run(sql`DROP TABLE \`events\`;`)
  await db.run(sql`ALTER TABLE \`__new_events\` RENAME TO \`events\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`events_icon_idx\` ON \`events\` (\`icon_id\`);`)
  await db.run(sql`CREATE INDEX \`events_image_idx\` ON \`events\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`events_updated_at_idx\` ON \`events\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`events_created_at_idx\` ON \`events\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`events__status_idx\` ON \`events\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__events_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_rhythmus\` text DEFAULT 'einmalig',
  	\`version_wochentag\` text,
  	\`version_datum\` text,
  	\`version_zeit\` text,
  	\`version_eyebrow\` text,
  	\`version_icon_id\` integer,
  	\`version_excerpt\` text,
  	\`version_body\` text,
  	\`version_preis\` text,
  	\`version_ort\` text DEFAULT 'Restaurant PINOT, Steigstrasse 12, 7306 Fläsch',
  	\`version_image_id\` integer,
  	\`version_cta_label\` text,
  	\`version_cta_url\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_icon_id\`) REFERENCES \`icons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new__events_v\`("id", "parent_id", "version_title", "version_rhythmus", "version_wochentag", "version_datum", "version_zeit", "version_eyebrow", "version_icon_id", "version_excerpt", "version_body", "version_preis", "version_ort", "version_image_id", "version_cta_label", "version_cta_url", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest") SELECT "id", "parent_id", "version_title", "version_rhythmus", "version_wochentag", "version_datum", "version_zeit", "version_eyebrow", "version_icon_id", "version_excerpt", "version_body", "version_preis", "version_ort", "version_image_id", "version_cta_label", "version_cta_url", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest" FROM \`_events_v\`;`)
  await db.run(sql`DROP TABLE \`_events_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__events_v\` RENAME TO \`_events_v\`;`)
  await db.run(sql`CREATE INDEX \`_events_v_parent_idx\` ON \`_events_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_icon_idx\` ON \`_events_v\` (\`version_icon_id\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_image_idx\` ON \`_events_v\` (\`version_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_updated_at_idx\` ON \`_events_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version_created_at_idx\` ON \`_events_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_version_version__status_idx\` ON \`_events_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_created_at_idx\` ON \`_events_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_updated_at_idx\` ON \`_events_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_events_v_latest_idx\` ON \`_events_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`__new_angebote\` (
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
  await db.run(sql`INSERT INTO \`__new_angebote\`("id", "title", "eyebrow", "icon_id", "description", "image_id", "cta_label", "cta_url", "order", "updated_at", "created_at") SELECT "id", "title", "eyebrow", "icon_id", "description", "image_id", "cta_label", "cta_url", "order", "updated_at", "created_at" FROM \`angebote\`;`)
  await db.run(sql`DROP TABLE \`angebote\`;`)
  await db.run(sql`ALTER TABLE \`__new_angebote\` RENAME TO \`angebote\`;`)
  await db.run(sql`CREATE INDEX \`angebote_icon_idx\` ON \`angebote\` (\`icon_id\`);`)
  await db.run(sql`CREATE INDEX \`angebote_image_idx\` ON \`angebote\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`angebote_updated_at_idx\` ON \`angebote\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`angebote_created_at_idx\` ON \`angebote\` (\`created_at\`);`)
}
