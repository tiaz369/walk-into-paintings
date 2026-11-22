---
name: verify-artwork
description: Check one Walk into Paintings artwork scene against quality-standards.md (data, bilingual text, image sources, room dates, image size, CDN, screenshots at 3 sizes, console errors, cards, exclusive toggle, axe, Lighthouse) and write the delivery report. Use before opening a PR that adds or changes a scene, or when Tia asks to check a painting.
---

# Goal
Say, with evidence, whether one scene meets the HARD rules of `quality-standards.md` section 9.1, list the SOFT rules it misses (9.2), and list what only a person can judge. Never claim facts, copyright or visual quality are verified without evidence.

# Inputs
- Scene id (folder name in `scenes/`, same as `data/scenes.json`), e.g. `painter-of-sunflowers`.
- Optional: the research pack / sources Tia gave, to compare facts.

# Process
1. Setup (once per container): `bash tools/verify_setup.sh`. Playwright + Chromium are already installed.
2. Make sure static HTML is current: `python3 tools/build.py`.
3. Run the checker:
   ```
   python3 tools/verify_artwork.py <id> --browser --lighthouse --links
   ```
   - `--links` needs network; failures other than 404 are WARN (network may be restricted).
   - Output: `verify-reports/<id>/report.txt`, `report.json`, screenshots `phone|tablet|desktop-1-first / 2-inside / 3a-before-exclusive / 3-exclusive / 4-after-exclusive.png`, `phone-5-end.png`, `lighthouse.json`.
   - Exit code 1 = at least one FAIL.
4. Look at the screenshots yourself (Read the PNGs). Check: painting not cropped (V1), nothing overlapping, text readable, exclusive discovery visible and closed again.
5. Work through every HUMAN row (see "What the script cannot check"). Do what an agent can (compare facts to sources, compare zh/en meaning); leave the rest for Tia, stated plainly.
6. Write the delivery report (template: `.claude/skills/add-artwork/reference/delivery-report.md`) into the PR description.

# Standards
- Result types: **PASS**; **FAIL** = HARD rule broken, must be fixed before merge; **WARN** = SOFT rule, list in report; **HUMAN** = a person must judge.
- New scenes (registry `added` ≥ 2026-11-22) are strict. Older scenes have three agreed exceptions shown as WARN: 6–7 cards (I2), images > 500 KB (P1), light scenes without loading progress (I4).
- Open decisions D1–D7 use the spec's defaults (Lighthouse 80 is SOFT, audio guide optional, no auto-merge).

# What the script checks (deterministic)
| Area | Rules |
|---|---|
| Registry + scene.json fields, 3 acts, final line, museums | 2.2, I1, G5 |
| `check_scenes.py` template rules for this scene | I1 |
| 6 cards, each with a hotspot, coordinates 0–1 | I2 |
| Every text has zh + en; card length | L1, L3 |
| sources include the owner museum's site | A1 |
| room ⇒ roomVerified; older than 90 days | A5, A7 |
| every image has a full `imageSource.files` entry; status 符合; allowed site; no forbidden site | C1, C2, C3 |
| images ≤ 500 KB | P1 |
| alt text zh + en | X2 |
| static HTML exists with title; viewport allows zoom; no unknown external scripts/styles | I1, M4, P2 |
| Browser, 390×844 / 820×1180 / 1440×900: no horizontal scroll, full painting on first screen, Enter button, card opens/closes (mouse + keyboard), exclusive opens/closes, ending has "see it in person" + next scene, no audio before a tap, no console errors / 404s | M1, M2, G1, G2, I2, I6, G5, I7, I8 |
| Phone: ≤ 3 visible buttons, tap targets ≥ 44px | I5, M3 |
| axe (WCAG 2 A/AA) on first screen and ending | X1, X5 |
| Lighthouse mobile performance, time to interactive, accessibility | P3, P4 |

# What the script cannot check (always HUMAN)
- Each fact really says what the source says; title/date/medium/size/credit match the official page exactly (A1–A3). A second agent may compare text to sources (spec 5.2); Tia approves.
- Interpretations hedged (A4); sensitive topics handled (L6); zh/en mean the same and read naturally (L2).
- The image file really is the Commons PD-Art / CC0 file in the record (C1). Open the file page.
- Whether an exclusive effect alters the painting and so needs "这是示意" (L7).
- Fonts on a real phone (V3), WeChat browser (M6), reduced motion (X4), first-time users finding cards (G3).
- 3D scenes: cards sit on objects in the room; the script opens one with `?card=`; keyboard use must be tried by a person. 3D scenes move by themselves, so I6 "back to normal" is HUMAN with a % difference.

# Deliverables
- `verify-reports/<id>/` (not committed).
- Delivery report in the PR description, listing: HARD all passed? / each FAIL fixed / each WARN with reason / each HUMAN item and who checks it.
- Send Tia the phone screenshots (first screen, inside, exclusive on) in the conversation.

# Feedback and failure handling
- FAIL → fix it, re-run, or ask Tia for an exception. Never merge with a FAIL (spec 7).
- WARN → may publish; write the reason and follow-up in the report.
- Script itself errors or gives a wrong result → fix the checker, add a case to `tools/tests/test_verify_artwork.py`, run `python3 -m unittest discover -s tools/tests`.
- A rule seems wrong for this site → don't silently loosen it; ask Tia and update `quality-standards.md` once agreed.
