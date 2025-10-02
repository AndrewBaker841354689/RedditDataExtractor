# Contributing Guidelines

Thank you for your interest in contributing!

## Development Rules
- All scraping and file generation must happen **client-side**; never send data to external servers.
- Keep Chrome permissions minimal (downloads, activeTab, reddit.com host access only).
- Maintain code readability: use clear names, JSDoc comments, and modular helpers in `util.js`.
- Use `async/await` consistently for asynchronous code.
- Preserve privacy: no analytics, logging, or hidden storage.

## Coding Invariants
- **No plaintext outside Markdown**: all post/comment data must flow into Markdown (or image downloads), never persisted elsewhere.
- **YAML values must be type-safe**: numbers and booleans stay unquoted, strings are quoted/escaped.
- **Filenames sanitized**: avoid path traversal, reserved names, unsafe characters; preserve Unicode.
- **Comment fetching**: honor `limit` (≤500) and `depth` (1–10) options; placeholders must be shown when deeper replies are omitted.
- **Error handling**: always surface diagnostics in Markdown so users know when fetches failed or were retried.

## Contribution Process
1. Fork the repository.
2. Create a feature branch for your change.
3. Make edits and include tests or manual validation steps.
4. Submit a pull request with a clear description of changes.

## Extension Ideas
- Add support for video downloads (`v.redd.it`).
- Smarter retry and backoff policies for comment fetching.
- UI polish: drag-and-drop URL input, dark mode toggle.
- Export options: JSON or ZIP bundle alongside Markdown.
