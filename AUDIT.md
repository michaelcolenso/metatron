# Metatron Audit — 2026-09-19

Scope: full repository review of this static photography-portfolio site (git history, published site code, build/maintenance scripts, CI/CD workflow, and repo hygiene). Verified by reading every tracked file, diffing `images/` against `docs/images/`, and exercising the gallery in a headless browser after the fixes below.

## Fixed in this PR

| # | Issue | Why it mattered | Fix |
|---|-------|------------------|-----|
| 1 | `docs/script.js` built the lightbox caption via string concatenation (`photo.title`, camera, lens, aperture, etc.) and assigned it with `modalCaption.innerHTML = captionHTML`. | Camera/lens strings come from EXIF metadata embedded in image files. EXIF text fields are attacker-controllable (any tool can write arbitrary bytes into a `Model`/`LensModel` tag), so a crafted image dropped into `images/` and republished would execute HTML/JS for every visitor who opened that photo's lightbox — a stored-XSS path on a page with no CSP. | Rewrote `openModal()` to build the caption with `createElement`/`textContent` instead of `innerHTML`. Verified in a headless Chromium run: caption renders identically (title, date, "Apple iPhone 12 Pro · 6 mm" style EXIF line) and the DOM now contains text nodes, not interpolated markup. |
| 2 | `metatron.txt` (18KB) at repo root was a full-text dump of the repository from an earlier point in its history — stale placeholder README ("Metatron is a project that [brief description]..."), and a pre-masonry version of `docs/script.js` that no longer matches the live site. | It's dead weight that actively misleads: it's the kind of file an assistant or contributor greps first for context, and everything in it about the current gallery behavior is wrong. Not referenced by any script, workflow, or doc. | Deleted. Fully recoverable from git history if it turns out to matter. |

Both changes are pure cleanup/hardening — no visible or functional change to the gallery's behavior (confirmed by browser test below).

## Findings that need your call (not changed here)

### 1. Every "thumbnail" is the full-resolution original — real page-weight problem
`docs/script.js` sets `img.src = images/${photo.name}` for every grid card and the lightbox alike. There is no `srcset`, no `<picture>`, no actual resized asset. `docs/images.js` *does* carry a `sizes: { thumb, medium, full }` field per photo, but those `thumb_*`/`medium_*` files don't exist anywhere in the repo (confirmed: zero files match `thumb_*`, `medium_*`, or `*.webp` in the whole tree) — the field is aspirational and currently dead. The largest source photo is 8.6MB; loading a 31-photo masonry grid currently means downloading the full 40MB of `docs/images/` on first paint for every mobile visitor.
**Recommendation:** either (a) generate real thumb/medium variants at build time and wire up `srcset`/`sizes`, or (b) if that's more than this project needs, drop the unused `sizes`/`hasWebP` fields from the data model so the schema stops implying a capability that doesn't exist. I'd lead with (a) — it's the single highest-impact change for an image-heavy site — but it's a scoped follow-up, not a drive-by fix.

### 2. Two independent, conflicting image-pipeline implementations
- `scripts/update-images.js` (committed, uses `exifreader`, run manually via `npm run update-images`) — writes `hasWebP: false`, never resizes, just copies originals.
- `.github/workflows/deploy.yml` (inline heredoc, uses `exiftool-vendored` + ImageMagick, installs its own throwaway `package.json` at runtime) — writes `hasWebP: true`, actually resizes and creates WebP variants.

They produce different `docs/images.js` schemas from the same source photos. Evidence the two have already diverged in practice: **every entry in the current `docs/images.js` says `"hasWebP": false`**, and the last catalogue regeneration (commit `08019b6`, "Regenerate image catalogue with EXIF metadata") was done by running the local Node script, not by the workflow — meaning the CI pipeline's ImageMagick/WebP step hasn't actually been the one in effect for a while, despite still being wired up to run on every push to `images/**` and every Sunday via cron.
**Recommendation:** pick one canonical pipeline and delete the other. If you want the resized/WebP variants from finding #1, that argues for keeping and fixing the CI version (and pointing `script.js` at the generated sizes); if you want a single, simple, locally-run script, retire the CI image-processing steps and keep `scripts/update-images.js` as the only path.

### 3. GitHub Pages deployment path is ambiguous from the repo alone
`README.md` tells contributors to configure Pages as "Deploy from a branch → `/docs`". `.github/workflows/deploy.yml` instead deploys via `actions/deploy-pages` (the "GitHub Actions" Pages source) — and only runs automatically on pushes that touch `images/**`, plus the weekly cron. GitHub Pages can only have one active source at a time, so one of these two mechanisms is currently not the one actually serving the site. This matters concretely: if Pages is set to the Actions source, then a commit that only touches `docs/styles.css` or `docs/script.js` (like the recent masonry-layout change) would **not** auto-deploy — no path in the workflow trigger covers non-image `docs/` edits, so it would sit unpublished until the Sunday cron or a manual `workflow_dispatch`.
**Recommendation:** check Settings → Pages on the actual repo, confirm which source is live, and either delete the unused mechanism or broaden the workflow's `paths` filter to include `docs/**`. I can't verify which is currently active from the checked-out code.

### 4. Eight source photos are dead weight
`images/*.HEIC` (`IMG_4952`, `IMG_5189`, `IMG_6001`, `IMG_6652`, `IMG_6897`, `IMG_7578`, `IMG_7621`, `IMG_7621(1)` — 8.9MB total) are never picked up by either image-processing script (both filter for `.jpg/.jpeg/.png` only) and HEIC doesn't render in Chrome/Firefox/Edge if it somehow did make it to the site. They just sit in the repo, invisible in the published gallery.
**Recommendation:** either convert them to JPEG and let them into the catalogue (if you want those photos published) or delete them (if they were already superseded/rejects). Left as-is they're just repo bloat with no upside.

### 5. Repo/`.git` size is large for the content (134MB `.git`, 89MB of tracked image bytes across `images/` + `docs/images/`)
Git history shows several full add/delete/re-add cycles for the images directory ("image reset", "Delete images directory", "Add files via upload" ×2+), so old full-resolution blobs are retained in history on top of the current 89MB working tree. Not urgent, but it'll keep growing every time photos churn.
**Recommendation:** no action needed now. If it becomes a real problem later, `git filter-repo` can reclaim the history bloat, but that rewrites history and force-pushes — flagging it here rather than doing it, since it's destructive and affects anyone else with a clone.

### 6. Minor/cosmetic
- No favicon (`docs/index.html` has no `<link rel="icon">`) — every browser silently 404s on `/favicon.ico`. Harmless but easy to fix.
- Several source filenames contain spaces and repeated `Copy`/`Copy Copy Copy` suffixes (e.g. `IMG_2201 Copy Copy Copy.JPG`, `IMG_1006 Copy.JPG`) — browsers handle the spaces fine via URL auto-encoding, so nothing is broken, but it suggests these are unreviewed export duplicates worth a pass.
- For at least one photo, `title` and the displayed date are identical strings shown twice in the lightbox (title defaults to the formatted date when no better title exists) — cosmetically redundant, not a bug.
- No automated tests. Reasonable for a site this size, but the one piece of real logic — EXIF/filename date-parsing fallback chains in `scripts/update-images.js` — is exactly the kind of thing that silently regresses without a test, if you ever touch it again.

## What I verified

- `node --check docs/script.js` — syntax valid after the edit.
- Served `docs/` locally and drove it with headless Chromium (Playwright): 31 cards render, opening a card produces a lightbox whose caption DOM now contains `<div class="modal-title">…</div><div class="modal-date">…</div><div class="modal-exif">…</div>` built from `textContent` (no markup injection), search filtering ("2022" → 4 results) still works. The one console 404 during the test was the browser's default `/favicon.ico` probe (see minor finding above), unrelated to this change.
- Compared every filename in `images/` against `docs/images/` and against `docs/images.js` — the 31 published photos match 1:1 with identical byte sizes (confirming they're copied, not resized); the 8 HEIC files are the only source images absent from the published set.
- Confirmed `metatron.txt` had zero references anywhere in the tracked tree before deleting it.

## What I did not touch

Items 1–5 above are architecture/product decisions (build a real thumbnailing pipeline, retire one of two CI paths, change live GitHub Pages settings, decide the fate of specific photos, or rewrite git history) — each has a real tradeoff or needs information I can't see from the checked-out repo, so I've laid out the recommendation rather than guessing your intent.
