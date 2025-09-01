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

// =========================
// Comments fetching & MD
// =========================

/**
 * Fetch comments JSON for a post via the public Reddit .json endpoint.
 * @param {string} permalink e.g., "/r/foo/comments/abcd12/title/"
 * @param {{sort?: 'top'|'new'|'best'|'confidence', limit?: number}} opts
 * @returns {Promise<object|null>} The comments Listing (array index 1 of the response) or null on failure
 */
async function fetchRedditComments(permalink, opts = {}) {
  try {
    if (!permalink) return null;
    const sort = opts.sort || 'top';
    const limit = Math.min(Math.max(opts.limit || 100, 1), 500);
    const url = `https://www.reddit.com${permalink}.json?sort=${encodeURIComponent(sort)}&limit=${limit}`;
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // Response is [postListing, commentsListing]
    return Array.isArray(json) && json[1] ? json[1] : null;
  } catch (e) {
    console.error('fetchRedditComments failed:', e);
    return null;
  }
}

/**
 * Convert a comments Listing (json[1]) into Markdown text.
 * Produces a nested bullet list; each comment shows author, score, time, and body.
 * @param {object|null} commentsListing
 * @returns {string}
 */
function buildCommentsMarkdown(commentsListing) {
  if (!commentsListing || !commentsListing.data || !Array.isArray(commentsListing.data.children)) return '';

  const lines = [];

  // Reddit returns a tree of comments; walk it depth-first.
  function walk(node, depth) {
    if (!node) return;
    const kind = node.kind;
    const data = node.data || {};

    if (kind === 't1') { // a comment
      const author = data.author || '[deleted]';
      const score = typeof data.score === 'number' ? data.score : '?';
      const created = typeof data.created_utc === 'number' ? fmtUtc(data.created_utc) : 'unknown';
      const body = (data.body || '').trim();
      const indent = '  '.repeat(Math.max(depth, 0));

      // Header line for the comment
      lines.push(`${indent}- **u/${author}** · ${score} pts · ${created}`);

      if (body) {
        // Indent the body one extra level and keep paragraphs
        const bodyLines = body.split('\n');
        bodyLines.forEach(bl => lines.push(`${indent}  ${bl}`));
      }

      // Recurse into replies
      if (data.replies && typeof data.replies === 'object' && data.replies.data) {
        const children = data.replies.data.children || [];
        children.forEach(child => walk(child, depth + 1));
      }
    } else if (kind === 'more') {
      // "more" placeholder (not expanded without OAuth); note presence so user knows.
      const indent = '  '.repeat(Math.max(depth, 0));
      if (Array.isArray(node.data?.children) && node.data.children.length) {
        lines.push(`${indent}- _(${node.data.children.length} more replies not fetched)_`);
      }
    }
  }

  commentsListing.data.children.forEach(child => walk(child, 0));

  return lines.join('\n');
}

/**
 * Helper: build the original post markdown and append a Comments section if available.
 * Does not change existing call-sites that use `buildMarkdown`.
 * @param {object} postFields - same shape used by `buildMarkdown`
 * @param {object|null} commentsListing - json[1] from fetchRedditComments
 * @returns {string}
 */
function buildMarkdownWithComments(postFields, commentsListing) {
  const base = buildMarkdown(postFields);
  const commentsMd = buildCommentsMarkdown(commentsListing);
  if (!commentsMd) return base;
  return base + '\n## Comments\n\n' + commentsMd + '\n';
}

// Expose helpers to popup.js/content scripts loaded in the same context
if (typeof window !== 'undefined') {
  window.fetchRedditComments = fetchRedditComments;
  window.buildCommentsMarkdown = buildCommentsMarkdown;
  window.buildMarkdownWithComments = buildMarkdownWithComments;
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

/**
 * Convenience: build full Markdown (post + comments) in one call.
 * Uses fetchRedditComments under the hood.
 * @param {object} postFields - same shape used by buildMarkdown
 * @param {{sort?: 'top'|'new'|'best'|'confidence', limit?: number}} opts
 * @returns {Promise<string>}
 */
async function buildFullMarkdown(postFields, opts = {}) {
  try {
    const commentsListing = await fetchRedditComments(postFields?.permalink, opts);
    return buildMarkdownWithComments(postFields, commentsListing);
  } catch (e) {
    console.error('buildFullMarkdown failed:', e);
    // Fallback to base post markdown if comments fail
    return buildMarkdown(postFields);
  }
}

if (typeof window !== 'undefined') {
  window.fetchRedditComments = fetchRedditComments;
  window.buildCommentsMarkdown = buildCommentsMarkdown;
  window.buildMarkdownWithComments = buildMarkdownWithComments;
  window.buildFullMarkdown = buildFullMarkdown;
}
