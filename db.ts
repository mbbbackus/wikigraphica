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
`);

const cols = db.query<{ name: string }, []>("pragma table_info(infographics)").all();
if (!cols.some((c) => c.name === "category")) {
  db.exec("alter table infographics add column category text");
}

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
};

export type InfographicView = Infographic & { image_url: string | null };

export function viewInfographic(row: Infographic): InfographicView {
  return {
    ...row,
    image_url: row.image_path ? `/images/${row.image_path}` : null,
  };
}

export const queries = {
  insertInfographic: db.prepare<unknown, [string, string, number]>(
    "insert into infographics (id, wiki_url, created_at) values (?, ?, ?)",
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
    "select * from infographics where status = 'done' order by created_at desc limit ?",
  ),
  byUrlDone: db.prepare<Infographic, [string, number]>(
    "select * from infographics where wiki_url = ? and status = 'done' order by created_at desc limit ?",
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
