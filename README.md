# Wikigraphica

Wikipedia, but every page is an infographic.

Paste a Wikipedia URL and Wikigraphica generates a magazine-style infographic for the page — and one for each section of the page, plus a key-facts sidebar. Browse the corpus as a force-directed graph clustered by topic, a gallery, or a single Wikipedia-style results page that fills in section-by-section as the worker churns.

## What it does

- **Editorial-magazine prompt pipeline** — every Wikipedia page is auto-classified into one of 131 categories (16 parents + 115 sub-types), each with a heavily-directed prompt: specific palette hex codes, named composition (cartographer's plate, illuminated manuscript, recipe-card spread, naturalist plate, etc.), typography references and motifs.
- **Auto fan-out per page** — one `/generate` call produces an *overview* infographic, a *key-facts* sidebar, *one infographic per H2/H3 section*, and a tiny *Olympic-pictogram icon* for each section header.
- **Page-level versioning** — each generation run is stamped with a `batch_id`. The Results page lets you flip between every version of the whole page (overview + infobox + every section), with empty slots shown when a version didn't include a piece.
- **Force-directed graph view** — every infographic is a colored node clustered by category territory, with convex-hull "country" outlines per category, edges from real Wikipedia outbound links, and a hover preview tooltip showing the infographic thumbnail.
- **Wikipedia crawler + worker** — `bun run build-queue` walks Wikipedia for 1000 article URLs (random-article seeded, polite-rate-limited). `bun run worker` processes the queue sequentially, polling each page until done.
- **Brutalist aesthetic** — thick black borders (4px), hard offset shadows (6×6), parchment-cream graph-paper background, monochrome buttons.

## Stack

- **[Bun](https://bun.sh)** runtime + `Bun.serve` for the HTTP server
- **SQLite** (via `bun:sqlite`) for persistence — `data/wikigraphica.db`
- **Local filesystem** for image storage — `data/images/<id>.png`
- **OpenAI** `gpt-image-2` for the image generation, `gpt-4o-mini` for category classification
- **D3.js** v7 for the graph view (force layout, drag, hover, convex hulls)
- **Cheerio** for parsing Wikipedia REST HTML (sections + infobox extraction)
- **[Phosphor Icons](https://phosphoricons.com/)** for category iconography
- Plain HTML/CSS/vanilla JS for the frontend — no framework

## Layout

```
wikigraphica/
├── server.ts          # Bun.serve: routes for /generate, /page-structure, /gallery, /graph, /by-url, /by-ids, /categories, /images/:id
├── db.ts              # SQLite schema + prepared statements
├── categories.ts      # 131-category hierarchy with editorial-magazine style briefs
├── wiki.ts            # Wikipedia URL parsing, summary fetch, prompt builders (overview / section / infobox)
├── wiki-structure.ts  # Cheerio-based section + infobox extractor (REST API HTML)
├── openai.ts          # Image-gen API wrapper
├── public/index.html  # Single-page frontend (graph, gallery, my stuff, results)
├── scripts/
│   ├── build-queue.ts    # Wikipedia crawler → data/queue.json
│   ├── worker.ts         # Sequential generator over the queue
│   ├── build-edges.ts    # Outbound-link crawler → data/edges.json
│   └── analyze-queue.ts  # Page-size + section-count stats over a sample
└── data/              # gitignored — db, images, queue.json, edges.json
```

## Schema

```sql
infographics      (id, wiki_url, wiki_title, ..., image_path, prompt, model, quality, size,
                   category, status, error, page_id, section_id, kind, batch_id)
wiki_pages        (id, wiki_url, wiki_title, wiki_lang, wiki_description, wiki_extract,
                   infobox_json, created_at)
wiki_sections     (id, page_id, section_index, kind, title, level, text_body, created_at)
```

`infographics.kind` is `NULL` (overview) | `'infobox'` | `'section'` | `'section_icon'`. `batch_id` is the overview's `id`, propagated to every fan-out child so a single regeneration run is one cohesive "version" of the page.

## Run it

Requirements: [Bun 1.x](https://bun.sh), an `OPENAI_API_KEY` with image-gen access.

```bash
# install
bun install

# .env (or export inline)
export OPENAI_API_KEY=sk-...
export PORT=3939
export IMAGE_QUALITY=low          # 'low' | 'medium' | 'high'
export IMAGE_SIZE=1024x1024
export IMAGE_MODEL=gpt-image-2

# dev server
bun run dev

# build a 1000-page queue (Wikipedia random article walk, ~25 min)
bun run build-queue

# generate edges for the graph (~10 min)
bun run build-edges

# run the worker through the queue (sequential, ~30s/page → ~8 hours for 1000)
bun run worker
```

Then open [http://localhost:3939](http://localhost:3939). The default tab is Gallery; paste any `https://en.wikipedia.org/wiki/X` URL into the search bar and hit Generate.

### Cost

Generation is the only billed component:

- Page overview: ~$0.04 per page
- Infobox: ~$0.04
- Section infographics: ~$0.04 each (15–30 sections per medium-size page on average)
- Section icons: ~$0.04 each (set `GENERATE_SECTION_ICONS=false` to skip)

A full pipeline run on one page typically costs **$1.50–$3.00** depending on length. 1000 pages worst-case = a few hundred dollars at low quality.

## API surface

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | Single-page app |
| `GET` | `/categories` | Hierarchy of categories with icon + parent-inherited color |
| `POST` | `/generate` | `{ url, category? }` → kicks off fan-out, returns the overview row |
| `GET` | `/by-url?url=` | All infographics for a wiki URL (any status) |
| `GET` | `/page-structure?url=` | `{ page, overview_infographics, sections }` for the structured Results render |
| `POST` | `/by-ids` | `{ ids: [...] }` → rows for those ids (used by My-stuff localStorage queue) |
| `GET` | `/gallery` | Most-recent overview per Wikipedia URL (deduped) |
| `GET` | `/graph` | `{ nodes, links }` for the d3 force layout |
| `GET` | `/images/:id.png` | Cached PNGs |

## Frontend

Vanilla JS, no build step. Tabs:

- **Graph** (default) — d3 force-directed nodes colored by category parent, convex-hull territories, real Wikipedia outbound-link edges. Drag, hover preview, click-through to results.
- **Gallery** — one tile per Wikipedia page, deduped by URL, hover-revealed regenerate dropdown.
- **My stuff** — local-only queue persisted in `localStorage["wg.my_ids"]`. Polls every 3s while anything is pending.
- **Results** — Wikipedia-style structured page (overview + key-facts sidebar + masonry of collapsible section cards). Version switcher between sidebar and sections to flip across all generated batches.

## License

Personal project. No license declared yet.
