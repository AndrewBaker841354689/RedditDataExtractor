

# TESTING

A quick manual test plan for the popup-only MV3 extension.

## 0) Setup
- Load **Developer Mode → Load unpacked** and select the extension folder.
- Ensure permissions are granted and the action icon is visible.
- Open Chrome DevTools **Console** for the popup (right‑click the popup → Inspect) to watch logs.

## 1) Sanity — scrape a simple text post
1. Navigate to a small text‑only Reddit post (no images, <50 comments).
2. Open the popup.
3. Verify the URL field auto‑filled.
4. Leave defaults: **Sort=top, Limit=100, Depth=5**, **Download images** unchecked.
5. Click **Scrape this post**.
6. Expect: one **.md** file appears in Downloads.
7. Open the file and verify sections: YAML front matter, Post body, `## Comments`, `## Extracted Mentions`, `## Fetch Diagnostics`.

## 2) Images — single image & gallery
1. Open a post with a single `i.redd.it` image. Enable **Download images** and scrape.
   - Expect: Markdown + one image file (correct extension) named with `_01` suffix.
2. Open a gallery post (multiple images). Scrape with **Download images**.
   - Expect: Markdown + multiple images enumerated `_01`, `_02`, … matching URLs.

## 3) Limits — top‑level 500 cap
1. Find a large thread (≥500 top‑level comments).
2. Set **Limit=500**, **Depth=1** (to speed up).
3. Scrape.
4. Expect: Diagnostics shows `limit: 500`; `## Comments` lists up to 500 top‑level entries.

## 4) Depth — reply expansion
1. On the same large thread, set **Limit=100**, **Depth=2** and scrape.
   - Expect: Replies nested two levels; deeper replies show as placeholders.
2. Set **Depth=5** and scrape again.
   - Expect: More reply levels expanded; fewer placeholders. File size and fetch time increase.

## 5) Sort — ordering differences
1. On a thread with mixed scores/timestamps, scrape with **Sort=top**, then **new**, then **best**.
2. Compare comment ordering in Markdown; verify `sort` reflected in Diagnostics.

## 6) Filename & YAML typing
1. Test a post title with emojis / non‑Latin characters.
   - Expect: Filename keeps Unicode; illegal chars stripped; no trailing dots/spaces.
2. In YAML front matter, verify:
   - `created_utc` is an unquoted number.
   - Boolean fields (if any) are unquoted `true`/`false`.
   - Strings are quoted.

## 7) URL handling
1. Paste a Reddit post URL **with** a trailing slash; scrape.
2. Paste the same URL **without** a trailing slash; scrape.
   - Expect: Both succeed; comments API URL has no `//.json`.

## 8) Error handling / rate limiting
1. Rapidly scrape 3–4 big threads.
2. Expect: If a `429`/5xx occurs, the popup reports a retry in Diagnostics; scraping either succeeds or exits cleanly with status.

## 9) Accessibility & UI
- Navigate the popup using **Tab** only; ensure visible focus and operable controls.
- Check prefers‑reduced‑motion / prefers‑contrast styles by toggling OS settings.

## 10) Known limitations (verify messaging)
- Deep threads still show `more` placeholders beyond selected **Depth**; Diagnostics calls this out.
- Videos from `v.redd.it` are not downloaded (by design).

## Regression checklist (per commit)
- [ ] Small text post scrapes (Section 1).
- [ ] Gallery enumerates image files (Section 2).
- [ ] Limit and Depth respected (Sections 3–4).
- [ ] Different Sort values reflected (Section 5).
- [ ] Filenames safe & YAML types correct (Section 6).
- [ ] Trailing‑slash JSON URL correct (Section 7).
- [ ] Diagnostics present and informative (Sections 8 & 10).
