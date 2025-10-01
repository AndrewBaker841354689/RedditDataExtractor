Reddit → Markdown Extractor (Chrome Extension)

This Chrome extension lets you archive Reddit posts (with comments and images) into clean Markdown files for later use with AI tools or personal archiving.

It scrapes post metadata, body text, images, and nested comments, then downloads everything into a structured .md file.

⸻

Features
	•	✅ Export any Reddit post to Markdown
	•	✅ Includes metadata (title, subreddit, author, timestamps, permalink)
	•	✅ Downloads attached images (single or gallery)
	•	✅ Nested comments with author, score, timestamp, and body
	•	✅ Extracted mentions (links, file paths, CLI flags, configs)
	•	✅ Diagnostics section (comment counts, domains, fetch status)
	•	✅ Copy a generic ChatGPT PROMPT.md for easy context prep
	•	✅ Dark/light mode styled popup UI

⸻

Installation
	1.	Clone or download this repo.
	2.	In Chrome, open chrome://extensions/.
	3.	Enable Developer mode (top right).
	4.	Click Load unpacked and select this project folder.
	5.	The extension should now appear in your toolbar.

⸻

Usage
	1.	Navigate to a Reddit post (e.g. https://www.reddit.com/r/.../comments/...).
	2.	Click the extension icon to open the popup.
	3.	Options available:
	•	Download images (checkbox)
	•	Sort comments (top, new, best, confidence)
	•	Limit (max number of comments to fetch, default 100)
	•	Depth (nesting depth of replies, default 5)
	4.	Click Scrape this post.
	5.	The extension will save a .md file in your Downloads folder (and images if enabled).

⸻

File Overview
	•	popup.html — UI for the extension popup
	•	popup.css — Modern styled interface (light/dark mode)
	•	popup.js — Handles scraping logic, saves files, downloads images
	•	util.js — Helper library for Markdown building, comment parsing, and safe filenames
	•	PROMPT.md — Reusable instructions template for ChatGPT

⸻

# Example Reddit Post  

- Subreddit: r/example  
- Author: u/example_user  
- Created: 2025-09-01 12:34 UTC  
- Permalink: https://www.reddit.com/r/example/comments/abc123/example_post/  
- Original URL: https://i.redd.it/xyz.jpg  

---

## Post body  

This is the body of the post.  

## Images  

1. https://i.redd.it/xyz.jpg  

## Comments  

- **u/replier** · 200 pts · 2025-09-01 13:00 UTC  
  This is a comment.

  Development Notes
	•	Uses Chrome downloads API for saving .md and image files.
	•	Comments fetched via Reddit’s public .json endpoint.
	•	No API keys or OAuth required.
	•	Fallbacks included for clipboard and downloads API.

⸻

License

MIT License © 2025 Andrew Baker
