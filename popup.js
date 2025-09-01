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

  // --- Helpers local to this file ---
  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function isRedditPostUrl(u) {
    try {
      const rx = /(old\.)?reddit\.com\/r\/[^/]+\/comments\//i;
      return rx.test(u);
    } catch {
      return false;
    }
  }

  function canonicalPostUrl(u) {
    if (!u) return "";
    const url = new URL(u);
    // strip query/fragment
    url.search = "";
    url.hash = "";
    // Ensure trailing slash so "<post>/ + .json" works reliably
    let s = url.toString();
    if (!s.endsWith("/")) s += "/";
    return s;
  }

  // --- Prefill current tab URL if it's a reddit post ---
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && isRedditPostUrl(tab.url)) {
      urlInput.value = tab.url;
    }
  } catch (e) {
    // Non-fatal; user can paste URL manually
  }

  async function scrape() {
    let postUrl = canonicalPostUrl(urlInput.value.trim());
    if (!postUrl || !isRedditPostUrl(postUrl)) {
      setStatus("Please paste a valid Reddit post URL (must contain /r/<sub>/comments/...).");
      return;
    }

    scrapeBtn.disabled = true;
    setStatus("Fetching JSON…");

    try {
      // Reddit returns post data at <post-url>.json
      const jsonUrl = postUrl + ".json";
      const resp = await fetch(jsonUrl, { credentials: "omit" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      // Post payload
      const post = data?.[0]?.data?.children?.[0]?.data;
      if (!post) throw new Error("Could not read post payload.");

      // Basic fields
      const title = post.title || "";
      const subreddit = post.subreddit || "";
      const author = post.author || "[deleted]";
      const createdUtc = fmtUtc(post.created_utc || 0);
      const permalink = post.permalink || "";
      const originalUrl = post.url_overridden_by_dest || post.url || "";
      const selftext = post.selftext || "";

      // --- Collect images (gallery or single) ---
      const imageUrls = [];
      const isGallery = !!post.is_gallery;

      if (isGallery) {
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
        // Single-image candidates (direct + preview + crosspost fallback)
        const candidates = [];
        if (originalUrl) candidates.push(originalUrl);

        const preview = post.preview;
        if (preview?.images?.length) {
          const u = preview.images[0]?.source?.url;
          if (u) candidates.push(u);
        }

        const xlist = post.crosspost_parent_list;
        if (Array.isArray(xlist) && xlist.length) {
          const x = xlist[0];
          const xUrl = x.url_overridden_by_dest || x.url;
          if (xUrl) candidates.push(xUrl);
          const xPrev = x.preview?.images?.[0]?.source?.url;
          if (xPrev) candidates.push(xPrev);
        }

        for (const c of candidates) {
          if (isImageUrl(c)) {
            imageUrls.push(normalizeUrl(c));
            break; // take the first viable image
          }
        }
      }

      // --- Build markdown (util.js provides buildMarkdown) ---
      const md = buildMarkdown({
        title,
        subreddit,
        author,
        createdUtc,
        permalink,
        url: originalUrl,
        selftext,
        imageUrls
      });

      // --- Save markdown (use data URL helper for reliability) ---
      const base = sanitizeFilename(`${title}_${post.id}`.replace(/_+$/, ""));
      await downloadBlob(`${base}.md`, md);

      // --- Save images (optional) ---
      if (downloadImagesCb.checked && imageUrls.length) {
        setStatus(`Downloading ${imageUrls.length} image(s)…`);
        let idx = 1;
        for (const u of imageUrls) {
          const ext = (() => {
            try { return new URL(u).pathname.split(".").pop() || "jpg"; }
            catch { return "jpg"; }
          })();
          const fname = `${base}_images/image_${String(idx).padStart(2, "0")}.${ext}`;
          await downloadUrl(fname, u);
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

  document.getElementById("scrapeBtn").addEventListener("click", scrape);
})();
