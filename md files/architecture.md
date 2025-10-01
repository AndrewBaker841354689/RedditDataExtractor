


# Architecture

## Overview
The Reddit Data Extractor is a Chrome MV3 extension that scrapes Reddit post data and exports it as Markdown with metadata and optional images. It consists of:
- **manifest.json** — Declares permissions (downloads, activeTab, reddit.com host) and action popup.
- **popup.html / popup.css** — User interface for scraping, with controls for URL input, options (download images, sort, limit, depth), and buttons (scrape, copy prompt).
- **popup.js** — Main logic. Reads form inputs, queries the active tab, fetches post + comments JSON, processes media, builds Markdown, and triggers downloads.
- **util.js** — Shared helpers: filename sanitization, YAML front matter generation, image URL normalization, Reddit comments fetcher (with limit up to 500 and configurable depth up to 10).
- **PROMPT.md** — Instruction template for ChatGPT ingestion.
- **README.md** — Project documentation.

## Data Flow
1. **User opens popup** → popup.js initializes UI, fills URL.
2. **User clicks Scrape** → popup.js reads URL, sort, limit, depth, and image checkbox.
3. **popup.js** requests the Reddit post `.json` API, then calls `util.js::fetchRedditComments` with `{sort, limit, depth}`.
4. **util.js** fetches JSON with `limit` (max 500 top-level) and `depth` (1–10 reply levels) plus `raw_json=1`.
5. **popup.js** assembles Markdown: YAML metadata, post body, image/media links, comments tree (with placeholders when Reddit returns `more`).
6. Files are downloaded via Chrome downloads API.

## Key Options
- **Limit**: maximum number of top-level comments (clamped 1–500).
- **Depth**: number of reply levels expanded (clamped 1–10, default 5).
- **Sort**: comment order (top, best, new, confidence).
- **Download images**: toggles saving attached media to local disk.

## Security/Privacy
- Minimal permissions: downloads, activeTab, reddit.com host.
- No external analytics; all data saved locally.