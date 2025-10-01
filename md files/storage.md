# Storage Layout

The extension does not persist data internally. All outputs are written directly to the user’s **Downloads** folder via the Chrome downloads API.

## File Types
- **Markdown (.md)**: Each scrape produces a Markdown file containing YAML front matter, post content, media links, comments tree, extracted mentions, and diagnostics.
- **Images (.jpg/.png/.gif/etc.)**: If the “Download images” option is selected, images are saved alongside the Markdown file. Gallery items are enumerated with suffixed filenames.

## Filenames
- Post Markdown filename is sanitized from the post title and ID to avoid illegal filesystem characters. Non-Latin characters are preserved.
- Image files are suffixed numerically (e.g., `_01.jpg`, `_02.png`) under the same base filename as the Markdown file.

## Metadata
- YAML front matter includes: id, title, subreddit, author, created_utc, permalink, url, and diagnostics.
- Diagnostics section in Markdown lists fetch status, retries, and any placeholder counts.

## Privacy
- No data is stored beyond what is written to the Downloads folder.
- No background storage, caching, or analytics are used.
