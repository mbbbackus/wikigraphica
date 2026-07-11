import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";

const DB_PATH = process.env.DB_PATH ?? "data/wikigraphica.db";
mkdirSync("data/images", { recursive: true });

export const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  create table if not exists infographics (
    id text primary key,
    wiki_url text not null,
    wiki_title text,
    wiki_lang text,
    wiki_description text,
    wiki_extract text,
    image_path text,
    prompt text,
    model text,
    quality text,
    size text,
    category text,
    status text not null default 'pending',
    error text,
    created_at integer not null,
    completed_at integer
  );

  create index if not exists infographics_url_idx on infographics(wiki_url);
  create index if not exists infographics_recent_idx on infographics(created_at desc);
  create index if not exists infographics_status_idx on infographics(status);

  create table if not exists wiki_pages (
    id text primary key,
    wiki_url text not null unique,
    wiki_title text not null,
    wiki_lang text not null,
    wiki_description text,
    wiki_extract text,
    infobox_json text,
    created_at integer not null
  );

  create table if not exists wiki_sections (
    id text primary key,
    page_id text not null references wiki_pages(id) on delete cascade,
    section_index integer not null,
    kind text not null,
    title text,
    level integer,
    text_body text,
    created_at integer not null
  );
  create index if not exists wiki_sections_page_idx on wiki_sections(page_id, section_index);
`);

const cols = db.query<{ name: string }, []>("pragma table_info(infographics)").all();
const colNames = new Set(cols.map((c) => c.name));
if (!colNames.has("category")) db.exec("alter table infographics add column category text");
if (!colNames.has("page_id")) db.exec("alter table infographics add column page_id text");
if (!colNames.has("section_id")) db.exec("alter table infographics add column section_id text");
if (!colNames.has("kind")) db.exec("alter table infographics add column kind text");
if (!colNames.has("batch_id")) db.exec("alter table infographics add column batch_id text");
if (!colNames.has("tags")) db.exec("alter table infographics add column tags text");
db.exec("create index if not exists infographics_batch_idx on infographics(batch_id)");

export type Infographic = {
  id: string;
  wiki_url: string;
  wiki_title: string | null;
  wiki_lang: string | null;
  wiki_description: string | null;
  wiki_extract: string | null;
  image_path: string | null;
  prompt: string | null;
  model: string | null;
  quality: string | null;
  size: string | null;
  category: string | null;
  status: "pending" | "done" | "error";
  error: string | null;
  created_at: number;
  completed_at: number | null;
  page_id: string | null;
  section_id: string | null;
  kind: string | null;
  batch_id: string | null;
  tags: string | null;
};

export type WikiPage = {
  id: string;
  wiki_url: string;
  wiki_title: string;
  wiki_lang: string;
  wiki_description: string | null;
  wiki_extract: string | null;
  infobox_json: string | null;
  created_at: number;
};

export type WikiSection = {
  id: string;
  page_id: string;
  section_index: number;
  kind: string; // 'infobox' | 'section'
  title: string | null;
  level: number | null;
  text_body: string | null;
  created_at: number;
};

export type InfographicView = Infographic & { image_url: string | null };

export function viewInfographic(row: Infographic): InfographicView {
  return {
    ...row,
    image_url: row.image_path ? `/images/${row.image_path}` : null,
  };
}

export const queries = {
  insertInfographic: db.prepare<unknown, [string, string, number, string]>(
    "insert into infographics (id, wiki_url, created_at, batch_id) values (?, ?, ?, ?)",
  ),
  insertInfographicForSection: db.prepare<
    unknown,
    [string, string, string, string, string, number, string]
  >(
    "insert into infographics (id, wiki_url, page_id, section_id, kind, created_at, batch_id) values (?, ?, ?, ?, ?, ?, ?)",
  ),
  insertInfographicForPage: db.prepare<unknown, [string, string, string, string, number, string]>(
    "insert into infographics (id, wiki_url, page_id, kind, created_at, batch_id) values (?, ?, ?, ?, ?, ?)",
  ),
  upsertWikiPage: db.prepare<
    unknown,
    [string, string, string, string, string | null, string | null, string | null, number]
  >(
    `insert into wiki_pages (id, wiki_url, wiki_title, wiki_lang, wiki_description, wiki_extract, infobox_json, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?)
     on conflict(id) do update set
       wiki_title = excluded.wiki_title,
       wiki_lang = excluded.wiki_lang,
       wiki_description = excluded.wiki_description,
       wiki_extract = excluded.wiki_extract,
       infobox_json = excluded.infobox_json`,
  ),
  insertWikiSection: db.prepare<
    unknown,
    [string, string, number, string, string | null, number | null, string | null, number]
  >(
    `insert into wiki_sections (id, page_id, section_index, kind, title, level, text_body, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
  ),
  deleteSectionsForPage: db.prepare<unknown, [string]>(
    "delete from wiki_sections where page_id = ?",
  ),
  getWikiPageByUrl: db.prepare<WikiPage, [string]>(
    "select * from wiki_pages where wiki_url = ?",
  ),
  getSectionsByPage: db.prepare<WikiSection, [string]>(
    "select * from wiki_sections where page_id = ? order by section_index asc",
  ),
  getInfographicsByUrl: db.prepare<Infographic, [string]>(
    "select * from infographics where wiki_url = ? order by created_at desc",
  ),
  markDone: db.prepare<
    unknown,
    [string, string, string, string, string, string, string, string, string, string | null, number, string]
  >(
    `update infographics set
       wiki_title = ?,
       wiki_lang = ?,
       wiki_description = ?,
       wiki_extract = ?,
       image_path = ?,
       prompt = ?,
       model = ?,
       quality = ?,
       size = ?,
       category = ?,
       status = 'done',
       completed_at = ?
     where id = ?`,
  ),
  markError: db.prepare<unknown, [string, number, string]>(
    "update infographics set status = 'error', error = ?, completed_at = ? where id = ?",
  ),
  getById: db.prepare<Infographic, [string]>(
    "select * from infographics where id = ?",
  ),
  galleryDone: db.prepare<Infographic, [number]>(
    `select * from (
       select *, row_number() over (partition by wiki_url order by created_at desc) as rn
       from infographics
       where status = 'done' and (kind is null or kind = 'overview')
     )
     where rn = 1
     order by created_at desc
     limit ?`,
  ),
  byUrl: db.prepare<Infographic, [string, number]>(
    "select * from infographics where wiki_url = ? order by created_at desc limit ?",
  ),
  getCompletedInfographics: db.prepare<unknown, []>(
    "select * from infographics where status = 'completed' order by created_at desc",
  ),
  updateInfographicTags: db.prepare<unknown, [string | null, string]>(
    "update infographics set tags = ? where id = ?",
  ),
};

export function byIds(ids: string[]): Infographic[] {
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const stmt = db.query<Infographic, string[]>(
    `select * from infographics where id in (${placeholders}) order by created_at desc`,
  );
  return stmt.all(...ids);
}
