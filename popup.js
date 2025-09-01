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

  // Convenience aliases to util helpers if present
  const normalize = (u) => (window.normalizeUrl ? window.normalizeUrl(u) : (u || ""));
  const ensureExt = (u, f = "jpg") => (window.ensureExt ? window.ensureExt(u, f) : (u || ""));

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

  // Helper to save text as a file using the downloads API
  async function saveTextFile(filename, text) {
    if (!chrome?.downloads?.download) throw new Error('chrome.downloads API unavailable');
    const blob = new Blob([String(text ?? "")], { type: "text/markdown" });
    const objectUrl = URL.createObjectURL(blob);
    try {
      await new Promise((resolve, reject) => {
        chrome.downloads.download({ url: objectUrl, filename, saveAs: false }, (downloadId) => {
          const err = chrome.runtime.lastError;
          if (err) return reject(err);
          resolve(downloadId);
        });
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function setStatus(msg, type = "") {
    statusEl.textContent = msg;
    statusEl.className = type ? type : "";
  }

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

  function normalizeUrl(u) {
    // Reddit preview urls often contain HTML entities
    return (u || "").replace(/&amp;/g, "&");
  }
  const fix = (s) => (s || "").replace(/&amp;/g, "&");

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
      let data;
      let resp = await fetch(jsonUrl, { credentials: "omit" });
      if (resp.status === 429) {
        await new Promise(r => setTimeout(r, 1200));
        resp = await fetch(jsonUrl, { credentials: "omit" });
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      data = await resp.json();

      const post = data?.[0]?.data?.children?.[0]?.data;
      if (!post) throw new Error("Could not read post payload.");

      const title = post.title || "";
      const subreddit = post.subreddit || "";
      const author = post.author || "[deleted]";
      const createdUtc = post.created_utc || 0; // let util.js fmtUtc handle formatting
      const permalink = post.permalink || "";
      const originalUrl = fix(post.url_overridden_by_dest || post.url || "");
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
            const u0 = src.u || src.gif || "";
            const u = ensureExt(normalize(u0), "jpg");
            if (u) imageUrls.push(u);
          }
        }
      } else {
        const candidates = [];
        if (originalUrl) candidates.push(originalUrl);
        const prev = fix(post.preview?.images?.[0]?.source?.url);
        if (prev) candidates.push(prev);
        const xlist = post.crosspost_parent_list;
        if (Array.isArray(xlist) && xlist.length) {
          const x = xlist[0];
          const xUrl = fix(x.url_overridden_by_dest || x.url); if (xUrl) candidates.push(xUrl);
          const xPrev = fix(x.preview?.images?.[0]?.source?.url); if (xPrev) candidates.push(xPrev);
        }
        for (const c of candidates) {
          const cu = ensureExt(normalize(c), "jpg");
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
        imageUrls,
        id: post.id
      }, { sort: 'top', limit: 100 });

      const base = window.sanitizeFilename(`${title}_${post.id}`.replace(/_+$/, ""));
      await saveTextFile(`${base}.md`, md);

      if (downloadImagesCb?.checked && imageUrls.length) {
        setStatus(`Downloading ${imageUrls.length} image(s)…`);
        let idx = 1;
        for (const u of imageUrls) {
          const ext = (() => {
            try {
              const m = new URL(u).pathname.match(/\.([a-z0-9]{2,5})$/i);
              return m ? m[1].toLowerCase() : "jpg";
            } catch { return "jpg"; }
          })();
          const fname = `${base}_images/image_${String(idx).padStart(2, "0")}.${ext}`;
          await downloadUrl(fname, u); // uses chrome.downloads API; no CORS issues
          idx++;
        }
      }

      setStatus(`Saved ${base}.md` + (downloadImagesCb?.checked ? ` and ${imageUrls.length} image(s).` : "."), "success");
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message || err}`, "error");
    } finally {
      scrapeBtn.disabled = false;
    }
  }

  document.getElementById("scrapeBtn")?.addEventListener("click", scrape);
})();
