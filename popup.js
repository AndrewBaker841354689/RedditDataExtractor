//
//  popup.js
//  RedditDataExtractor
//
//  Rebuilt on 2025-09-01
//

(async function () {
  const urlInput = document.getElementById("url");
  const scrapeBtn = document.getElementById("scrapeBtn");
  const downloadImagesCb = document.getElementById("downloadImages");
  const statusEl = document.getElementById("status");

  // Ensure we have a CORS-safe downloader even if util.js wasn't loaded first
  const downloadUrl = (typeof window !== 'undefined' && typeof window.downloadUrl === 'function')
    ? window.downloadUrl
    : function downloadUrlFallback(filename, url) {
        return new Promise((resolve, reject) => {
          try {
            if (!chrome?.downloads?.download) {
              return reject(new Error('chrome.downloads API unavailable'));
            }
            chrome.downloads.download(
              { url, filename, saveAs: false },
              (downloadId) => {
                const err = chrome.runtime.lastError;
                if (err) return reject(err);
                resolve(downloadId);
              }
            );
          } catch (e) {
            reject(e);
          }
        });
      };

  function setStatus(msg) { statusEl.textContent = msg; }

  function isRedditPostUrl(u) {
    try { return /(old\.)?reddit\.com\/r\/[^/]+\/comments\//i.test(u); } catch { return false; }
  }

  function canonicalPostUrl(u) {
    if (!u) return "";
    const url = new URL(u);
    url.search = ""; url.hash = "";
    let s = url.toString();
    if (!s.endsWith("/")) s += "/";
    return s;
  }

  function fmtUtc(epochSecs) {
    if (!epochSecs) return "unknown";
    try { return new Date(epochSecs * 1000).toISOString().split(".")[0] + "Z"; } catch { return "unknown"; }
  }

  function normalizeUrl(u) {
    // Reddit preview urls often contain HTML entities
    return (u || "").replace(/&amp;/g, "&");
  }

  function isImageUrl(u) {
    try {
      const ext = new URL(u).pathname.split(".").pop()?.toLowerCase() || "";
      return ["jpg","jpeg","png","webp","gif"].includes(ext);
    } catch { return false; }
  }

  // Prefill current tab URL if it's a reddit post
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && isRedditPostUrl(tab.url)) urlInput.value = tab.url;
  } catch {}

  async function scrape() {
    let postUrl = canonicalPostUrl(urlInput.value.trim());
    if (!postUrl || !isRedditPostUrl(postUrl)) {
      setStatus("Please paste a valid Reddit post URL (must contain /r/<sub>/comments/...).");
      return;
    }

    scrapeBtn.disabled = true;
    setStatus("Fetching JSON…");

    try {
      const jsonUrl = postUrl + ".json";
      const resp = await fetch(jsonUrl, { credentials: "omit" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      const post = data?.[0]?.data?.children?.[0]?.data;
      if (!post) throw new Error("Could not read post payload.");

      const title = post.title || "";
      const subreddit = post.subreddit || "";
      const author = post.author || "[deleted]";
      const createdUtc = fmtUtc(post.created_utc || 0);
      const permalink = post.permalink || "";
      const originalUrl = post.url_overridden_by_dest || post.url || "";
      const selftext = post.selftext || "";

      // Collect images
      const imageUrls = [];
      if (post.is_gallery) {
        const items = post.gallery_data?.items || [];
        const meta = post.media_metadata || {};
        for (const { media_id } of items) {
          const m = meta[media_id] || {};
          if (m.e === "Image") {
            const src = m.s || {};
            const u = normalizeUrl(src.u || src.gif || "");
            if (u) imageUrls.push(u);
          }
        }
      } else {
        const candidates = [];
        if (originalUrl) candidates.push(originalUrl);
        const prev = post.preview?.images?.[0]?.source?.url;
        if (prev) candidates.push(prev);
        const xlist = post.crosspost_parent_list;
        if (Array.isArray(xlist) && xlist.length) {
          const x = xlist[0];
          const xUrl = x.url_overridden_by_dest || x.url; if (xUrl) candidates.push(xUrl);
          const xPrev = x.preview?.images?.[0]?.source?.url; if (xPrev) candidates.push(xPrev);
        }
        for (const c of candidates) {
          const cu = normalizeUrl(c);
          if (isImageUrl(cu)) { imageUrls.push(cu); break; }
        }
      }

      // Build markdown with comments using util.js helper exposed on window
      const md = await window.buildFullMarkdown({
        title,
        subreddit,
        author,
        createdUtc,
        permalink,
        url: originalUrl,
        selftext,
        imageUrls
      }, { sort: 'top', limit: 100 });

      const base = window.sanitizeFilename(`${title}_${post.id}`.replace(/_+$/, ""));
      await window.downloadBlob(`${base}.md`, md);

      if (downloadImagesCb?.checked && imageUrls.length) {
        setStatus(`Downloading ${imageUrls.length} image(s)…`);
        let idx = 1;
        for (const u of imageUrls) {
          const ext = (() => { try { return new URL(u).pathname.split(".").pop() || "jpg"; } catch { return "jpg"; } })();
          const fname = `${base}_images/image_${String(idx).padStart(2, "0")}.${ext}`;
          await downloadUrl(fname, u); // uses chrome.downloads API; no CORS issues
          idx++;
        }
      }

      setStatus("Done. Check your downloads.");
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message || err}`);
    } finally {
      scrapeBtn.disabled = false;
    }
  }

  document.getElementById("scrapeBtn")?.addEventListener("click", scrape);
})();
