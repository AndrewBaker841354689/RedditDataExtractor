# Changelog

## [Unreleased]
- (none)

## [0.2.0] - 2025-10-01
- Added UI controls for **Sort**, **Limit**, and **Depth** in popup.
- `util.js` now honors `depth` (default 5, clamped 1–10) and includes `raw_json=1` when fetching comments.
- Fixed `.json` URL builder to avoid double slashes.
- Improved `sanitizeFilename` to preserve Unicode, remove only filesystem-unsafe characters, and handle reserved names.
- Improved `yamlVal` to keep numbers/booleans unquoted.
- Tightened `isImageUrl` to reduce false positives, added better gallery fallback.
- Updated README, architecture, storage, security, contributing, and testing docs.

## [0.1.0] - Initial version
- Basic popup UI to scrape Reddit posts.
- Markdown export with YAML front matter.
- Image downloading (single + gallery).
- Comment scraping with diagnostics.
