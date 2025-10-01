


# Security Model

## Goals
- Keep permissions minimal (downloads, activeTab, and reddit.com host access).
- Ensure all scraping and file generation happens client-side with no external servers.
- Protect user privacy by avoiding any background data collection or analytics.

## Threat Mitigations
- **Minimal Permissions**: Extension only requests access to Reddit domains and downloads API.
- **No Persistent Storage**: Data is written directly to the Downloads folder; nothing is cached in extension storage.
- **Sanitized Filenames**: Post titles and IDs are cleaned to avoid unsafe characters, path traversal, or Windows reserved names.
- **YAML Escaping**: Values in metadata are properly escaped/quoted to prevent breaking parsers.
- **Diagnostics Transparency**: Each scrape includes a diagnostics block in the Markdown so users can see fetch status, retries, and placeholders.

## Out-of-Scope Threats
- **Complete Reddit data extraction**: Without OAuth and `/api/morechildren`, some deep comments are not fetched (placeholders remain).
- **Bypassing Reddit rate limits**: The extension only retries lightly on 429/5xx; it does not evade API protections.
- **Content authenticity**: Data is scraped as-is from Reddit’s JSON API; no attempt is made to validate authorship or prevent edited/deleted content.

## Privacy Notes
- The extension never transmits data to third parties.
- No analytics, telemetry, or logging are implemented.
- All processing occurs in the user’s browser.