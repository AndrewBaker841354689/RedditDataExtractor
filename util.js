//
//  util.js
//  RedditDataExtractor
//
//  Created by Andrew Baker on 9/1/25.
//

// Small helpers used by popup.js

function sanitizeFilename(s, maxLen = 80) {
  const cleaned = s
    .trim()
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "_");
  return (cleaned || "reddit_post").slice(0, maxLen);
}

function isImageUrl(url) {
  if (!url) return false;
  const u = url.toLowerCase();
  return (
    u.endsWith(".jpg") ||
    u.endsWith(".jpeg") ||
    u.endsWith(".png") ||
    u.endsWith(".gif") ||
    u.endsWith(".webp") ||
    u.includes("i.redd.it") ||
    u.includes("preview.redd.it") ||
    u.includes("i.imgur.com")
  );
}

function normalizeUrl(url) {
  if (!url) return url;
  return url.toLowerCase().endsWith(".gifv") ? url.slice(0, -5) + ".gif" : url;
}

function fmtUtc(ts) {
  try {
    return new Date(ts * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC");
  } catch {
    return "unknown";
  }
}

function buildMarkdown({ title, subreddit, author, createdUtc, permalink, url, selftext, imageUrls }) {
  const lines = [
    `# ${title || ""}`,
    "",
    `- Subreddit: r/${subreddit || "?"}`,
    `- Author: u/${author || "[deleted]"}`,
    `- Created: ${createdUtc}`,
    `- Permalink: https://www.reddit.com${permalink || ""}`,
    `- Original URL: ${url || ""}`,
    "",
    "---",
    ""
  ];

  if (selftext && selftext.trim()) {
    lines.push("## Post body", "", selftext, "");
  }

  if (imageUrls && imageUrls.length) {
    lines.push("## Images", "");
    imageUrls.forEach((u, i) => lines.push(`${i + 1}. ${u}`));
    lines.push("");
  }

  return lines.join("\n");
}

// Replace downloadBlob with a data-URL version for reliability
async function downloadBlob(filename, blobOrText) {
  let text;
  if (blobOrText instanceof Blob) {
    text = await blobOrText.text();
  } else {
    text = String(blobOrText ?? "");
  }
  const dataUrl = "data:text/markdown;charset=utf-8," + encodeURIComponent(text);
  const id = await chrome.downloads.download({
    url: dataUrl,
    filename,        // e.g., "Title_id.md"
    saveAs: false    // no prompt; goes straight to Downloads
  });
  if (!id && chrome.runtime.lastError) {
    throw new Error(chrome.runtime.lastError.message);
  }
}
