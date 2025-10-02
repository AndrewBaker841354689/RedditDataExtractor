

# Reader Instructions (Reddit Archive)

You are reading a **single archived Reddit post** exported by the RedditDataExtractor Chrome extension.

## What you will receive
The archive is a Markdown file that may include:

- **YAML front matter** (top of file): metadata like `id`, `url`, `title`, `subreddit`, `author`, `flair`, `score`, `created_utc`, `edited`, `nsfw`, `locked`, `awards`, and any extractor diagnostics.
- **Post body** in Markdown (OP’s content).
- **Images/attachments list** with filenames and `source_url` when available.
- **Comments** as a nested Markdown outline with metadata (author, score, created_utc, collapsed/removed markers).
- **Diagnostics**: runtime notes (rate limits, partial loads, errors).
- **Extractor version** and configuration snippet.

> Treat the archive as a snapshot; some fields can be missing or redacted.

---

## Your tasks
1. **High-level summary** of the post’s topic and context in 3–6 sentences.
2. **Key claims & evidence**  
   - Pull out the main claims from OP and top comments.  
   - For each claim, point to supporting text using **light inline quotes** (≤10 words) or section anchors like “OP ¶2”, “TopCmt #3”.
3. **Links / files / flags / paths / configs**  
   - Extract external links, file paths, CLI flags, config keys/values, and any code blocks.  
   - Present as a concise list (deduplicate).
4. **Entities & terminology**  
   - Identify named entities (people, orgs, products, subreddits), key acronyms, and domain terms with 1‑line descriptions.
5. **Timeline (if applicable)**  
   - Build an ordered list of dated events derived from the text (UTC if timestamps are present).
6. **Quality & reliability notes**  
   - Call out: speculation, source bias, missing data, contradictions, deleted/edited content, or screenshot‑only evidence.
7. **Open questions** the archive raises and **next steps** for research or verification.

---

## Output format (strict)
Return **only** the sections below, in this order, using these headings exactly.

### Summary
- …

### Key Claims & Evidence
1) **Claim:** …  
   **Evidence:** “…” — OP ¶… / Cmt #…

### Links / Files / Flags
- …

### Entities & Terms
- **Name** — what/why it matters.

### Timeline
- 2024‑03‑14 — Event …

### Reliability Notes
- …

### Open Questions
- …

### Next Steps
- …

### Machine JSON
Provide a compact JSON for downstream tools:

```json
{
  "summary": "",
  "claims": [
    {"text": "", "evidence_ref": "OP ¶2"}
  ],
  "links_files_flags": [],
  "entities": [{"name": "", "type": "", "note": ""}],
  "timeline": [{"date": "", "event": ""}],
  "reliability": [{"issue": "", "note": ""}],
  "open_questions": [""],
  "next_steps": [""]
}
```

---

## Style rules
- Be concise, **no speculation** beyond what’s in the archive.  
- If data is missing, say so explicitly.  
- Prefer UTC dates; include timezone only if given.  
- Quote minimally (≤10 words) and **never paste sensitive tokens/keys** if present—mask as `****`.  
- Do **not** link out; if a URL exists, list it verbatim without fetching.