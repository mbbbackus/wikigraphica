import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";

const DB_PATH = process.env.DB_PATH ?? "data/wikigraphica.db";
mkdirSync("data/images", { recursive: true });

export const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  create table if not exists users (
    id text primary key,
    username text unique not null,
    password_hash text not null,
    created_at integer not null
  );

  create table if not exists infographics (
    id text primary key,
    user_id text not null references users(id),
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
    status text not null default 'pending',
    error text,
    created_at integer not null,
    completed_at integer
  );

  create index if not exists infographics_url_idx on infographics(wiki_url);
  create index if not exists infographics_user_recent_idx on infographics(user_id, created_at desc);
  create index if not exists infographics_recent_idx on infographics(created_at desc);
  create index if not exists infographics_status_idx on infographics(status);
`);

export type User = {
  id: string;
  username: string;
  password_hash: string;
  created_at: number;
};

export type Infographic = {
  id: string;
  user_id: string;
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
  status: "pending" | "done" | "error";
  error: string | null;
  created_at: number;
  completed_at: number | null;
};

export type InfographicView = Infographic & {
  image_url: string | null;
  username: string | null;
};

const selectInfographicWithUser = `
  select i.*, u.username as username
  from infographics i
  left join users u on u.id = i.user_id
`;

export function viewInfographic(row: any): InfographicView {
  return {
    ...row,
    image_url: row.image_path ? `/images/${row.image_path}` : null,
  };
}

export const queries = {
  createUser: db.prepare<unknown, [string, string, string, number]>(
    "insert into users (id, username, password_hash, created_at) values (?, ?, ?, ?)",
  ),
  getUserByUsername: db.prepare<User, [string]>(
    "select * from users where username = ?",
  ),
  getUserById: db.prepare<User, [string]>("select * from users where id = ?"),

  insertInfographic: db.prepare<unknown, [string, string, string, number]>(
    "insert into infographics (id, user_id, wiki_url, created_at) values (?, ?, ?, ?)",
  ),
  markDone: db.prepare<
    unknown,
    [string, string, string, string, string, string, string, string, string, string, number, string]
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
       status = 'done',
       completed_at = ?
     where id = ?`,
  ),
  markError: db.prepare<unknown, [string, number, string]>(
    "update infographics set status = 'error', error = ?, completed_at = ? where id = ?",
  ),
  getById: db.prepare<any, [string]>(
    `${selectInfographicWithUser} where i.id = ?`,
  ),
  galleryDone: db.prepare<any, [number]>(
    `${selectInfographicWithUser} where i.status = 'done' order by i.created_at desc limit ?`,
  ),
  myQueue: db.prepare<any, [string, number]>(
    `${selectInfographicWithUser} where i.user_id = ? order by i.created_at desc limit ?`,
  ),
  byUrlDone: db.prepare<any, [string, number]>(
    `${selectInfographicWithUser} where i.wiki_url = ? and i.status = 'done' order by i.created_at desc limit ?`,
  ),
};
