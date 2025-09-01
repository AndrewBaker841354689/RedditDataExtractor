# Reddit Data Extractor (Chrome Extension)

## Overview
Reddit Data Extractor is a Chrome extension that allows you to scrape a Reddit post and export it as a Markdown (.md) file. Along with the text and metadata, the extension can also download associated images from the post. This makes it easy to archive Reddit discussions in a clean, portable format.

## Features
- Extracts the **title, subreddit, author, timestamp, body text, and post URL**.
- Saves post content into a **Markdown file** for easy readability and compatibility with tools like Obsidian, Notion, or any text editor.
- Downloads images from posts, including single-image posts and multi-image galleries.
- Includes **comment scraping**, appending them to the Markdown file under a `## Comments` section.
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
4. Click **Scrape this post**:
   - A `.md` file will be generated containing the post title, metadata, body, and comments.
   - If the "Download images" checkbox is enabled, all images will also be downloaded into a subfolder.

5. Check your **Downloads** folder for the saved files.

## File Structure
```
RedditDataExtractor/
├── manifest.json        # Chrome extension manifest (permissions, entry points)
├── popup.html           # Popup user interface
├── popup.js             # Popup logic and scraper
├── util.js              # Utility functions for scraping & saving
├── popup.css            # Styling for popup window
└── icons/               # Extension icons (16x16, 48x48, 128x128)
```

## Permissions
The extension requires the following Chrome permissions:
- `activeTab` – to detect the current Reddit post URL.
- `downloads` – to save Markdown files and images directly to your Downloads folder.
- `scripting` – to execute scraping logic within the page context.
- `host_permissions` – access to `reddit.com`, `old.reddit.com`, `i.redd.it`, and `preview.redd.it` for fetching posts and media.

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
