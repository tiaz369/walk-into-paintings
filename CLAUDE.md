# 走进名画 · Walk into Paintings — rules for Claude Code

Static GitHub Pages site (https://walkintopaintings.com). Vanilla ES modules, no build step, no framework, no npm dependencies in the repo.
The full production spec is `quality-standards.md` (rule IDs A1–A7, L1–L8, I1–I9, V1–V6, M1–M7, P1–P4, X1–X5, C1–C5; checklist in section 9).
How the code is laid out and how a scene is added: `README.md`.

## Who decides
- Tia (they/them) owns the site and is a coding beginner. Reply in short, plain Chinese; explain steps, not jargon.
- Tia decides: new artworks/artists, new themes or series, factual changes, About/brand/credits, new image source sites, every merge (spec section 8).
- Never merge, deploy, buy services, change secrets or edit production data without Tia saying so. Open a pull request; Tia merges.
- The site credit is only "由 Tia 创作与策划 / Created and curated by Tia". No AI-tool credits on the site. No real names other than "Tia" in any project file.

## Facts and text
- Never invent facts. Every fact needs a source; the owning museum's official page wins conflicts (spec 2.3). Wikipedia/Wikimedia only for leads and files.
- Interpretations are hedged: "可能 / perhaps / may".
- Every visible text has Chinese and English (`{"zh": …, "en": …}`).
- Missing size/date on the official page: leave empty and flag it; never estimate.
- Room number only with a `roomVerified` date (YYYY-MM-DD).
- Effects that change how the painting looks say "这是示意。/ This is an illustration."
- English painting titles inside sentences are italic (`*Irises*`); standalone label/record titles are not.

## Images and media
- Allowed: Wikimedia Commons PD-Art/CC0, Art Institute of Chicago, The Met, NGA Washington, Rijksmuseum open access (`tools/verify_artwork.py` → `IMAGE_ALLOW`).
- Forbidden download sources: NG London, Courtauld, KHM, Mauritshuis, Van Gogh Museum site, RMN/Orsay, Google Arts & Culture, Art UK, Bridgeman, Christie's, Tate. Linking to their artwork pages is fine.
- Every file in `scenes/<id>/images/` has an `imageSource.files` entry: file, from, url, license, status (`符合`), verified.
- New images ≤ 500 KB. No external CDNs (three.js is vendored in `assets/vendor/`).
- Wikimedia often rate-limits (429) from this environment: ask Tia to upload the file instead of retrying.

## Code
- Shared behaviour lives once in `assets/` (`engine.js` 3D, `light.js` 2D layered, `site.js`, `sound.js`…). A new scene is one folder `scenes/<id>/` + one entry in `data/scenes.json`.
- After changing data or scenes run `python3 tools/build.py` (regenerates static HTML; also runs `tools/check_scenes.py`).
- Don't change unrelated pages. Keep the existing design language (fonts, colours, button styles).

## Checks before every PR that adds or changes an artwork
```
python3 tools/verify_artwork.py <id> --browser --lighthouse     # report in verify-reports/<id>/
python3 -m unittest discover -s tools/tests                      # tests for the checker itself
```
- First time in a new container: `bash tools/verify_setup.sh` (installs axe-core + Lighthouse outside the repo).
- All FAIL must be fixed (or Tia agrees an exception). WARN and HUMAN items go into the PR's delivery report (spec 6.4).
- Use the skills: `.claude/skills/add-artwork/` to build a new painting, `.claude/skills/verify-artwork/` to check one.

## Git
- Work on the session's `claude/…` branch, push, open a PR. Never force-push or rebase someone else's commits.
- `verify-reports/` is git-ignored; attach the screenshots Tia needs to see to the conversation, not the repo.
