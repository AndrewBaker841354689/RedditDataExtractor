//
//  util.js
//  RedditDataExtractor
//
//  Created by Andrew Baker on 9/1/25.
//

// Small helpers used by popup.js

function sanitizeFilename(s, maxLen = 80) {
  let cleaned = String(s ?? "")
    .trim()
    // remove characters invalid on Windows/macOS filesystems and control chars
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    // normalize unicode (compatibility) to fold visually-similar forms
    .normalize('NFKC')
    // collapse whitespace to underscores
    .replace(/\s+/g, "_")
    // disallow leading dots (hidden files) and trailing dots/spaces/underscores
    .replace(/^\.+/, "")
    .replace(/[._\s]+$/g, "");
  // Avoid Windows reserved names
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  if (reserved.test(cleaned)) cleaned = `_${cleaned}_`;
  if (!cleaned) cleaned = "reddit_post";
  if (cleaned.length > maxLen) cleaned = cleaned.slice(0, maxLen);
  return cleaned;
}

// Simple YAML value escaper (uses JSON stringification for safety)
function yamlVal(v) {
  if (v === undefined || v === null) return '""';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  // Quote and escape strings safely
  return JSON.stringify(String(v));
}

// Collect plain text from a Reddit comments Listing (json[1])
function _collectCommentText(commentsListing) {
  const out = [];
  try {
    const walk = (node) => {
      if (!node || !node.kind) return;
      if (node.kind === 't1' && node.data) {
        const body = (node.data.body || '').toString();
        if (body.trim()) out.push(body);
        // Recurse
        const replies = node.data.replies;
        if (replies && typeof replies === 'object' && replies.data && Array.isArray(replies.data.children)) {
          replies.data.children.forEach(walk);
        }
      } else if (node.data && Array.isArray(node.data.children)) {
        node.data.children.forEach(walk);
      }
    };
    if (commentsListing && commentsListing.data && Array.isArray(commentsListing.data.children)) {
      commentsListing.data.children.forEach(walk);
    }
  } catch {}
  return out.join('\n');
}

// Extract URLs, file paths, config key=val pairs, and CLI flags from a blob of text
function _extractMentions(text) {
  const t = String(text || '');
  const urls = Array.from(new Set((t.match(/https?:\/\/[^\s)]+/g) || []).slice(0, 50)));
  const winPaths = Array.from(new Set((t.match(/[A-Za-z]:\\[^\s"']+/g) || []).slice(0, 50)));
  const nixPaths = Array.from(new Set((t.match(/\/(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+/g) || []).slice(0, 50)));
  const flags = Array.from(new Set((t.match(/--[A-Za-z0-9][A-Za-z0-9-]*/g) || []).slice(0, 50)));
  const kvPairs = Array.from(new Set((t.match(/\b([A-Za-z0-9_.-]{2,})\s*=\s*([^\s,;]+)/g) || []).slice(0, 50)));
  return { urls, paths: [...winPaths, ...nixPaths].slice(0, 50), flags, kvPairs };
}

// Build a Markdown section summarizing extracted mentions
function buildExtractedMentionsSection(postFields, commentsListing) {
  try {
    const baseText = [
      postFields?.title || '',
      postFields?.selftext || '',
      postFields?.url || '',
    ].join('\n');
    const commentsText = _collectCommentText(commentsListing);
    const { urls, paths, flags, kvPairs } = _extractMentions(baseText + '\n' + commentsText);

    const lines = [];
    if (urls.length || paths.length || flags.length || kvPairs.length) {
      lines.push('## Extracted Mentions', '');
      if (urls.length) {
        lines.push('**Links**');
        urls.slice(0, 20).forEach(u => lines.push(`- ${u}`));
        lines.push('');
      }
      if (paths.length) {
        lines.push('**Files / Paths**');
        paths.slice(0, 20).forEach(p => lines.push(`- ${p}`));
        lines.push('');
      }
      if (kvPairs.length) {
        lines.push('**Config key=value**');
        kvPairs.slice(0, 20).forEach(kv => lines.push(`- ${kv}`));
        lines.push('');
      }
      if (flags.length) {
        lines.push('**CLI Flags**');
        flags.slice(0, 20).forEach(f => lines.push(`- ${f}`));
        lines.push('');
      }
    }
    return lines.join('\n');
  } catch {
    return '';
  }
}

function _domainOf(u) {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function buildDiagnosticsSection(postFields, commentsListing) {
  try {
    const baseText = [
      postFields?.title || '',
      postFields?.selftext || '',
      postFields?.url || '',
    ].join('\n');
    const commentsText = _collectCommentText(commentsListing);
    const { urls } = _extractMentions(baseText + '\n' + commentsText);
    const domains = Array.from(new Set(urls.map(_domainOf).filter(Boolean)));
    const { comments, morePlaceholders } = countComments(commentsListing);

    const diag = (typeof window !== 'undefined' && window.__lastFetchDiagnostics && window.__lastFetchDiagnostics.comments) ? window.__lastFetchDiagnostics.comments : null;

    const lines = ['## Fetch Diagnostics', ''];
    lines.push(`- Comments processed: ${comments}`);
    lines.push(`- "More replies" placeholders: ${morePlaceholders}`);
    lines.push(`- Unique link domains: ${domains.length}${domains.length ? ' — ' + domains.slice(0, 8).join(', ') + (domains.length > 8 ? ', …' : '') : ''}`);
    if (diag) {
      lines.push(`- Comments endpoint: ${diag.url || '(unknown)'}`);
      lines.push(`- HTTP status: ${diag.status}${diag.retried ? ' (retried)' : ''}`);
      lines.push(`- OK: ${diag.ok ? 'yes' : 'no'}`);
    }
    lines.push('');
    return lines.join('\n');
  } catch {
    return '';
  }
}

// =========================
// Comments fetching & MD
// =========================

/**
 * Fetch comments JSON for a post via the public Reddit .json endpoint.
 * @param {string} permalink e.g., "/r/foo/comments/abcd12/title/"
 * @param {{sort?: 'top'|'new'|'best'|'confidence', limit?: number, depth?: number}} opts
 * @returns {Promise<object|null>} The comments Listing (array index 1 of the response) or null on failure
 */
async function fetchRedditComments(permalink, opts = {}) {
  try {
    let _diag = { url: '', status: 0, retried: false, ok: false };
    if (!permalink) return null;
    const sort = opts.sort || 'top';
    const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500); // top-level only
    const depth = Math.min(Math.max(opts.depth ?? 5, 1), 10);   // replies depth, default 5
    const params = new URLSearchParams({
      sort,
      limit: String(limit),
      depth: String(depth),
      raw_json: "1"
    }).toString();
    const url = `https://www.reddit.com${permalink}.json?${params}`;
    _diag.url = url;
    let res = await fetch(url, { credentials: 'omit' });
    _diag.status = res.status;
    if (res.status === 429) {
      _diag.retried = true;
      // minimal backoff & single retry
      await new Promise(r => setTimeout(r, 1200));
      res = await fetch(url, { credentials: 'omit' });
      _diag.status = res.status;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    _diag.ok = true;
    if (typeof window !== 'undefined') {
      window.__lastFetchDiagnostics = window.__lastFetchDiagnostics || {};
      window.__lastFetchDiagnostics.comments = _diag;
    }
    // Response is [postListing, commentsListing]
    return Array.isArray(json) && json[1] ? json[1] : null;
  } catch (e) {
    console.error('fetchRedditComments failed:', e);
    if (typeof window !== 'undefined') {
      window.__lastFetchDiagnostics = window.__lastFetchDiagnostics || {};
      window.__lastFetchDiagnostics.comments = { url: '', status: 0, retried: false, ok: false };
    }
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
      const body = (data.body || '').trim().replace(/```/g, "\\`\\`\\`");
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

function countComments(commentsListing) {
  let count = 0;
  let more = 0;
  try {
    const walk = (node) => {
      if (!node) return;
      if (node.kind === 't1') {
        count++;
        const data = node.data || {};
        if (data.replies && typeof data.replies === 'object' && data.replies.data) {
          (data.replies.data.children || []).forEach(walk);
        }
      } else if (node.kind === 'more') {
        more += Array.isArray(node.data?.children) ? node.data.children.length : 0;
      } else if (node.data && Array.isArray(node.data.children)) {
        node.data.children.forEach(walk);
      }
    };
    if (commentsListing && commentsListing.data && Array.isArray(commentsListing.data.children)) {
      commentsListing.data.children.forEach(walk);
    }
  } catch {}
  return { comments: count, morePlaceholders: more };
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
  const mentions = buildExtractedMentionsSection(postFields, commentsListing);
  const diagnostics = buildDiagnosticsSection(postFields, commentsListing);
  if (!commentsMd && !mentions && !diagnostics) return base;
  let out = base;
  if (mentions) out += '\n' + mentions + '\n';
  if (commentsMd) out += '\n## Comments\n\n' + commentsMd + '\n';
  if (diagnostics) out += '\n' + diagnostics + '\n';
  return out;
}

function isImageUrl(url) {
  if (!url) return false;
  const u = String(url).toLowerCase();
  // Known image suffixes
  if (/(\.|%2e)(jpg|jpeg|png|gif|webp)(\?|#|$)/i.test(u)) return true;
  // Allow extension-less originals on i.redd.it (often no ext)
  if (/^https?:\/\/i\.redd\.it\/[a-z0-9]+$/i.test(u)) return true;
  // preview.redd.it often specifies format/size via query params
  if (u.includes('preview.redd.it') && /[?&](format|width|height)=/i.test(u)) return true;
  return false;
}

function pickExtForFilename(url, fallback = "jpg") {
  try {
    const u = new URL(url);
    // 1) If the path already has an extension, keep it (normalize jpeg -> jpg)
    const m = u.pathname.match(/\.([a-z0-9]{2,5})$/i);
    if (m) {
      let ext = m[1].toLowerCase();
      if (ext === "jpeg") ext = "jpg";
      return ext;
    }
    // 2) preview.redd.it encodes format in the query string
    if (u.hostname.endsWith("preview.redd.it")) {
      const fmt = (u.searchParams.get("format") || "").toLowerCase();
      if (/^p?jpe?g$/.test(fmt)) return "jpg";
      if (fmt === "png") return "png";
      if (fmt === "webp") return "webp";
      if (fmt === "gif") return "gif";
    }
    // 3) Default
    return fallback;
  } catch {
    return fallback;
  }
}

function ensureExt(url, fallback = "jpg") {
  // DEPRECATED BEHAVIOR: Previously appended an extension to the URL string itself,
  // which corrupted URLs with query strings (e.g., preview.redd.it?...format=jpg).
  // NEW BEHAVIOR: Only append an extension to the URL when it is safe to do so:
  //  - path has no extension
  //  - no query string present
  //  - host is known to serve extensionless originals (e.g., i.redd.it)
  try {
    const u = new URL(url);

    // If the path already has an extension, return original URL unchanged
    if (/\.[a-z0-9]{2,5}$/i.test(u.pathname)) return url;

    // If there's a query string, don't mutate the URL (prevents .jpg after ?params)
    if (u.search) return url;

    // Only mutate for i.redd.it (extensionless originals are common here)
    if (/^i\.redd\.it$/i.test(u.hostname)) {
      u.pathname = u.pathname + "." + (fallback || "jpg");
      return u.toString();
    }

    // For all other hosts, leave URL untouched
    return url;
  } catch {
    return url;
  }
}

function normalizeUrl(url) {
  if (!url) return url;
  const lower = url.toLowerCase();
  if (lower.endsWith(".gifv")) {
    if (lower.includes("imgur.com")) return url.slice(0, -5) + ".mp4";
    return url.slice(0, -5) + ".gif";
  }
  return url;
}

function fmtUtc(ts) {
  try {
    return new Date(ts * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC");
  } catch {
    return "unknown";
  }
}

function buildMarkdown({ title, subreddit, author, createdUtc, permalink, url, selftext, imageUrls, id }) {
  const createdStr = typeof createdUtc === 'number' ? fmtUtc(createdUtc) : (createdUtc || 'unknown');
  const createdIso = (typeof createdUtc === 'number') ? new Date(createdUtc * 1000).toISOString() : (createdUtc || '');
  const yaml = [
    '---',
    `title: ${yamlVal(title || '')}`,
    `subreddit: ${yamlVal(subreddit ? `r/${subreddit}` : '?')}`,
    `author: ${yamlVal(author ? `u/${author}` : '[deleted]')}`,
    `created_utc: ${yamlVal(typeof createdUtc === 'number' ? Math.floor(createdUtc) : (createdUtc || 'unknown'))}`,
    `created_iso: ${yamlVal(createdIso)}`,
    `permalink: ${yamlVal(`https://www.reddit.com${permalink || ''}`)}`,
    `original_url: ${yamlVal(url || '')}`,
    (id ? `post_id: ${yamlVal(id)}` : null),
    '---',
    ''
  ].filter(Boolean).join('\n');

  const lines = [
    yaml,
    `# ${title || ""}`,
    "",
    `- Subreddit: r/${subreddit || "?"}`,
    `- Author: u/${author || "[deleted]"}`,
    `- Created: ${createdStr}`,
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

  // Optional section for downstream LLMs to summarize/extract key points
  lines.push("## Extracted Summary", "", "_(Add notes or let an LLM summarize key points here.)_", "");

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
  window.sanitizeFilename = sanitizeFilename;
  window.ensureExt = ensureExt;
  window.buildExtractedMentionsSection = buildExtractedMentionsSection;
  // NEW: expose canonical helpers so popup.js doesn't redefine them
  window.isImageUrl = isImageUrl;
  window.pickExtForFilename = pickExtForFilename;
  window.normalizeUrl = normalizeUrl;
  window.buildDiagnosticsSection = buildDiagnosticsSection;
  window.countComments = countComments;
}
