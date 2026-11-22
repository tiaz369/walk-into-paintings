---
name: add-artwork
description: Build a new painting scene for Walk into Paintings from Tia's research pack — check eligibility and image rights, write scene.json and the registry entry, link it into the site, rebuild, verify, and open a PR with a delivery report. Use when Tia sends a new painting ("本周新画", a spec, a research pack).
---

# Goal
Turn one approved painting into a live-ready scene (`scenes/<id>/` + `data/scenes.json` entry) that passes every HARD rule in `quality-standards.md` 9.1, with a delivery report Tia can approve from her phone.

# Inputs
- Research pack from Tia (spec 2.2; checklist: `reference/research-pack.md`). The build agent never writes facts (D5): every fact comes from the pack or a source in it.
- The image: a Commons PD-Art / CC0 or museum open-access file. If Commons returns 429, ask Tia to upload it into the repo.
- Variant: `interior` / `outdoor` (3D, `engine.js`) or `still-life` / `portrait` (light, `light.js`). Cheat sheet: `reference/variants.md`.

# Process
1. **Inspect** — read `CLAUDE.md`, README "如何新增一个场景", and the closest existing scene of the same variant (copy it as the starting point).
2. **Eligibility (2.1)** — artist died > 70 years ago; allowed image exists; official museum page exists. If no allowed image: stop and tell Tia (spec 7).
3. **Check the pack** — every required field present (`reference/research-pack.md`). Missing size/date: leave empty, flag. Room without a date: leave the room out. List anything that cannot be traced to a source; do not fill gaps yourself.
4. **Image** — put the file in `scenes/<id>/images/`, ≤ 500 KB (resize with Pillow if needed, keep aspect), record it in `imageSource.files` (file, from, url, license, status `符合`, verified = retrieval date) and in `images/README.md`.
5. **Write `scene.json`** — reuse existing fields and components only. 6 discovery cards, each title + 1–2 sentences, zh + en. 3 acts + final line. One exclusive discovery not used by another scene (`check_scenes.py` checks); add "这是示意。/ This is an illustration." when it changes the painting. Ambience from `assets/sound.js` `AMBIENCE`. Lighting, links, sources, lastVerified.
6. **Hotspots** — light scenes: `spots` x/y (0–1) on the real detail in the painting; check them on the screenshot. 3D scenes: objects/viewpoint as in the reference scene.
7. **Registry + cross-links** — `data/scenes.json` entry (status live, path, cover, added = publish date, artist, museum, collection, themes/moods/period/place from existing taxonomy; new theme needs Tia). Add to the series `order`; update artist/museum/city data and `data/life/` only with facts Tia gave.
8. **Build** — `python3 tools/build.py`; read the `check_scenes.py` output.
9. **Verify** — run the `verify-artwork` skill:
   `python3 tools/verify_artwork.py <id> --browser --lighthouse --links`. Fix every FAIL; look at the screenshots.
10. **Deliver** — commit on the session branch, push, open a PR whose description is the delivery report (`reference/delivery-report.md`). Send Tia the phone screenshots. Tia merges.

# Standards
`quality-standards.md` sections 2, 4 and 9 are the rules. The most common misses:
- Fact without a source, or an unhedged interpretation (A1, A4).
- Text only in one language, or a card longer than 2 sentences (L1, L3).
- Image from a forbidden site, or no `imageSource.files` entry (C1–C3).
- Image > 500 KB (P1).
- Card count not 6 (I2); exclusive repeats another scene (I1).

# Constraints
- Never invent historical facts. Never estimate sizes or dates.
- Keep the existing design language; no new libraries, fonts or CDNs.
- Don't change unrelated pages; list any change outside the new scene in the report.
- Don't publish or merge. No real names other than "Tia" in project files.

# Verification
Done only when:
- `tools/verify_artwork.py <id> --browser` has no FAIL (or Tia approved an exception in writing).
- Both language versions are complete.
- Every fact is traceable to a source in `sources` / `sources.md`.
- Phone, tablet and desktop screenshots looked at.
- `python3 -m unittest discover -s tools/tests` passes if the checker was touched.

# Deliverables
- `scenes/<id>/` (scene.json, index.html via build, images/ + README.md, sources.md), registry entry, regenerated static HTML.
- PR with the delivery report (spec 6.4).
- Screenshots in the conversation.

# Feedback and failure handling
| Situation | Do |
|---|---|
| Fact can't be verified | Remove or hedge it; list it under "open questions". |
| Sources disagree | Use the owner museum's version; note the conflict. |
| No allowed image / Commons blocked | Stop; ask Tia to upload or choose another painting. |
| HARD check fails | Fix and re-run; if it can't be fixed, ask Tia. Don't merge. |
| SOFT check fails | Publish allowed; list with reason and follow-up. |
| Change breaks another scene | Revert that change; report it. |
| Tia corrects something after review | Fix, re-run verify, update the report; if it's a recurring mistake, add it to "most common misses" above. |
