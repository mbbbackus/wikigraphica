-- Run this in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).
-- The server bootstraps the storage bucket itself on first run.

create extension if not exists pgcrypto;

create table if not exists public.infographics (
  id uuid primary key default gen_random_uuid(),
  wiki_url text not null,
  wiki_title text not null,
  wiki_lang text not null,
  wiki_description text,
  wiki_extract text,
  image_path text not null,
  prompt text not null,
  model text not null,
  quality text,
  size text,
  created_at timestamptz not null default now()
);

create index if not exists infographics_wiki_url_idx
  on public.infographics (wiki_url);

create index if not exists infographics_created_at_idx
  on public.infographics (created_at desc);

create index if not exists infographics_search_idx
  on public.infographics
  using gin (
    to_tsvector(
      'english',
      coalesce(wiki_title, '') || ' ' || coalesce(wiki_extract, '')
    )
  );
