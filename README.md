# Reddit Data Extractor (Chrome Extension)

## Overview
Reddit Data Extractor is a Chrome extension that allows you to scrape a Reddit post and export it as a Markdown (.md) file. Along with the text and metadata, the extension can also download associated images from the post. This makes it easy to archive Reddit discussions in a clean, portable format.

## Features
- Extracts the **title, subreddit, author, timestamp, body text, and post URL**.
- Saves post content into a **Markdown file** for easy readability and compatibility with tools like Obsidian, Notion, or any text editor.
- Includes **YAML front-matter metadata** in the Markdown file for structured data representation.
- Downloads images from posts, including single-image posts and multi-image galleries.
- Includes **comment scraping**, appending them to the Markdown file under a `## Comments` section.
- Adds a structured `## Extracted Mentions` section listing links, file paths, configs, and flags found in the post.
- Provides a `## Fetch Diagnostics` section summarizing comments processed, placeholders encountered, domains accessed, and fetch statuses.
- Features a “Copy Prompt” button that copies ChatGPT instruction templates to the clipboard for further processing.
- Works with both new Reddit (`reddit.com`) and Old Reddit (`old.reddit.com`).

## Installation
1. Clone or download this repository to your computer.
2. Open **Chrome** and go to `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `RedditDataExtractor` folder.
5. The extension will now appear in your toolbar.

## Usage
1. Navigate to a Reddit post in your browser.
2. Click the **Reddit → Markdown** extension icon in your toolbar.
3. The popup will auto-fill with the current Reddit post URL if you are on a valid post page.
4. Use the **Scrape this post** button to generate a `.md` file containing the post title, metadata, body, comments, extracted mentions, and fetch diagnostics.
5. Use the **Download images** checkbox to enable downloading all images into a subfolder alongside the Markdown file.
6. Use the **Copy Prompt** button to copy a ChatGPT instruction template to your clipboard for further interaction or processing.
7. Check your **Downloads** folder for the saved files.

## File Structure
```
RedditDataExtractor/
├── manifest.json        # Chrome extension manifest (permissions, entry points)
├── popup.html           # Popup user interface
├── popup.js             # Popup logic and scraper
├── util.js              # Utility functions for scraping & saving
├── popup.css            # Styling for popup window
├── PROMPT.md            # Instruction template for ChatGPT
└── icons/               # Extension icons (16x16, 48x48, 128x128)
```

## Permissions
The extension requires the following Chrome permissions:
- `activeTab` – to detect the current Reddit post URL.
- `downloads` – to save Markdown files and images directly to your Downloads folder.
- `host_permissions` – access to `*://*.reddit.com/*` for fetching posts.

## Notes
- Comments are fetched via Reddit's public `.json` API endpoints.
- For very large threads, some replies may appear as `more replies not fetched` placeholders (since deep expansion requires authentication).
- Markdown is generated in a clean format, preserving nested comment structure as bullet lists.

## Future Improvements
- Add options for choosing comment sort order (top, new, best).
- Allow user to set maximum comment depth or limit.
- Support video downloads from `v.redd.it`.

---
Enjoy archiving Reddit posts with **Reddit Data Extractor**!
