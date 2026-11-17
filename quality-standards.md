# Walk into Paintings — Artwork Production & Quality Specification

Version 0.1 (draft) · 17 November 2026 · Owner: Tia

---

## 0. How to read this document

**Status tags**

| Tag | Meaning |
|---|---|
| **[CONFIRMED]** | Already agreed and in use on the project. Follow as written. |
| **[RECOMMENDED]** | Proposed by the research/QA advisor. Follow unless Tia rejects it. |
| **[DECISION]** | Needs Tia's decision. Until decided, use the stated default and flag it in the report. |

**Gate levels**

- **HARD** — a failure blocks publication. No exceptions without Tia's written approval.
- **SOFT** — a failure is allowed, but must be listed in the delivery report with a reason and a follow-up.

**Important for the implementing agent**

This specification was written **without reading the latest codebase**. Before implementing anything:

1. Compare every rule here with the current repo (`data/scenes.json`, `scenes/<slug>/scene.json`, `assets/engine.js`, `assets/style.css`, existing validation scripts, generated static HTML).
2. List conflicts in three groups: *rule matches code* / *rule conflicts with code* / *rule not yet implemented*.
3. Report the conflicts to Tia **before** changing code. Where the code already works well, the code wins and this document is updated.

---

## 1. Product goal

### 1.1 Core value [CONFIRMED]

Walk into Paintings is an online gallery you can step inside. Each artwork page turns looking at a painting into a short exploration: see the original → step inside → find details → hear the story → find where to see the real thing.

> 走进世界名画的内部。 · Step inside the world's great paintings.
> 不需要懂艺术史，只需要一点好奇。

### 1.2 Users [CONFIRMED]

- Curious non-experts (main audience).
- Museum-goers planning or remembering a visit.
- Chinese- and English-speaking readers, often on a phone, sometimes in mainland China.

### 1.3 Observable outcomes for every artwork page [RECOMMENDED]

Tested on a 390 × 844 viewport (iPhone-size) unless stated.

| ID | Outcome | How to observe |
|---|---|---|
| G1 | The original painting is visible, uncropped, within the first screen. | Screenshot at 390×844 |
| G2 | The "step inside" action is reachable without scrolling past more than one screen of text. | Screenshot / scroll measurement |
| G3 | A first-time user can find at least one discovery card without instructions beyond the one-line hint. | Human test (1–3 people) |
| G4 | Interface elements cover ≤ 25% of the scene view on phone. | Screenshot measurement |
| G5 | The page ends with "see the real thing" information and a link to the next scene. | DOM check |

### 1.4 Product metrics [DECISION]

Tracked via GoatCounter events (`enter-scene`, `step-inside`, `found-3`, `ending`, `see-real`, `surprise-me`, `audio`, `share-card`) [CONFIRMED].

Suggested targets (default until Tia decides — **D1**):

- `step-inside` / `enter-scene` ≥ 50%
- `ending` / `enter-scene` ≥ 30%

Metrics inform priorities; they never block publication.

---

## 2. Inputs

### 2.1 Artwork eligibility — all HARD [CONFIRMED]

An artwork may be produced only if:

1. The artist died more than 70 years ago.
2. A usable image exists under an allowed licence (see 2.4).
3. The owning institution has an official online record (catalogue page) — or Tia approves an exception.
4. Priority goes to artists already listed on the site before adding new artists.

### 2.2 Research pack — required before writing code [CONFIRMED]

Delivered by the research editor (currently Tia + research assistant — see **D5**):

| Field | Required | Notes |
|---|---|---|
| Title (zh / en) | Yes | English title as on the owner's official page |
| Artist + dates (zh / en) | Yes | |
| Date | Yes | Use the owner's form, e.g. "about 1881–6" |
| Medium, size (cm) | Yes | Size from the owner's official page. If missing, leave empty and flag; never estimate. |
| Owner / credit line | Yes | |
| Official artwork URL | Yes | |
| On display / room / loan | Yes | Room only if verified; include `lastVerified` date |
| Variant | Yes | `interior` / `outdoor` / `still-life` / `portrait` |
| Themes, period, mood | Yes | Use existing taxonomy; new theme needs Tia's approval |
| Artist bio (zh / en) | Yes | 2–3 sentences |
| 6 discovery cards (zh / en) | Yes | Title + 1–2 sentences each |
| Story (three acts) | Yes | Three short paragraphs |
| Final line (zh / en) | Yes | |
| Exclusive discovery | Yes | With "This is an illustration" label if it alters the original |
| Ambience (sound) | Yes | Music optional |
| Links to other scenes | Yes | |
| Sources | Yes | At least one official museum source |
| Image source | Yes | File URL, licence, date retrieved |

### 2.3 Source hierarchy [CONFIRMED]

1. Owning museum's official website / catalogue / published technical bulletin — **wins all conflicts**.
2. Other museum or academic publications.
3. Wikipedia / Wikimedia — only for locating files and leads, never as the sole source of a fact.

Facts must come from a source. No AI-invented facts. Interpretations are hedged ("perhaps", "may", "可能").

### 2.4 Images and media — all HARD [CONFIRMED]

**Allowed**
- Museum open-access / CC0 images: Art Institute of Chicago, The Met, National Gallery of Art (Washington), Rijksmuseum.
- Wikimedia Commons files marked public domain (PD-Art), including "Google Art Project" files hosted on Commons.

**Forbidden (download source)**
- National Gallery London, Courtauld, KHM Vienna, Mauritshuis, Van Gogh Museum website, RMN / Musée d'Orsay, Google Arts & Culture website, Art UK, Bridgeman, Christie's, Tate (CC BY-NC-ND).
- Visitor or gallery-room photos; photos of 3D works unless CC0; modern location photos; film stills; banknotes; logos.

**Text**
- Short quotations only from copyrighted translations, with attribution.

**Adding a new image source domain requires Tia's approval.** [RECOMMENDED]

---

## 3. Workflow

Weekly cadence: **one new painting every Sunday** [CONFIRMED].

| # | Step | Owner | Output | Gate |
|---|---|---|---|---|
| 1 | Select artwork | Tia | Title + reason | Eligibility 2.1 |
| 2 | Research pack | Research editor | Pack per 2.2 | All required fields filled |
| 3 | Fact check | Research editor | Each fact linked to a source | A1–A7 |
| 4 | Tia review of text | Tia | Approved zh/en text | Tia OK |
| 5 | Image acquisition | Build agent | Image + `imageSource` | C1–C5 |
| 6 | Build scene | Build agent | `scenes/<slug>/`, registry entry | Schema valid |
| 7 | Cross-links | Build agent | Artist, museum, theme, city, series pages updated | Link check |
| 8 | Automated checks | Build agent | Check log | Section 5.1 all pass |
| 9 | Visual check | Build agent | Screenshots (phone, tablet, desktop) | V, M rules |
| 10 | Delivery report | Build agent | Report per 6.4 | Complete |
| 11 | Approve + merge | Tia | Live page | Section 8 |
| 12 | Social drafts | Agent drafts, Tia posts | X (en/zh), 小红书, 朋友圈, 视频号 | Tia OK |

Recommended timing [RECOMMENDED]: research by Thursday, build by Saturday, publish Sunday.

---

## 4. Quality standards

### 4.1 Accuracy (A)

| ID | Rule | Gate | Status |
|---|---|---|---|
| A1 | Every factual statement traces to a listed source. | HARD | CONFIRMED |
| A2 | Title, date, medium, size and owner match the owner's official page exactly. | HARD | CONFIRMED |
| A3 | No invented facts, quotes, names or numbers. | HARD | CONFIRMED |
| A4 | Interpretations are hedged and distinguishable from facts. | HARD | CONFIRMED |
| A5 | Room numbers appear only if verified, with `lastVerified` date. | HARD | CONFIRMED |
| A6 | Owner and current display location are kept separate (e.g. owned by NG London, on loan to Hugh Lane Gallery, Dublin 2026–2031). | HARD | CONFIRMED |
| A7 | Room / loan info older than 90 days is re-verified before it is promoted (home page, social posts). | SOFT | DECISION (D2) |

### 4.2 Language — Chinese and English (L)

| ID | Rule | Gate | Status |
|---|---|---|---|
| L1 | Every visible text exists in both zh and en, with the same meaning. | HARD | CONFIRMED |
| L2 | Plain language; no unexplained art-history jargon. | SOFT | CONFIRMED |
| L3 | Discovery card: 1–2 sentences per language. Story: three short paragraphs. | SOFT | CONFIRMED |
| L4 | Italics for artwork titles in running English text; not in labels / archive fields. Parenthetical descriptors in roman. | SOFT | CONFIRMED |
| L5 | zh and en separated by a line break; " · " only within one language. | SOFT | CONFIRMED |
| L6 | Sensitive topics (self-harm, illness, nudity, minors, alcohol, looting) stated plainly and briefly, no dramatisation. | HARD | CONFIRMED |
| L7 | Any effect that changes the original's appearance carries "这是示意 / This is an illustration". Not needed for zoom or real-original comparisons. | HARD | CONFIRMED |
| L8 | British or American English used consistently across the site. | SOFT | DECISION (default: keep current site usage) |

### 4.3 Interaction (I)

| ID | Rule | Gate | Status |
|---|---|---|---|
| I1 | Scene follows the skeleton: original → step inside → discovery cards → exclusive discovery → story → archive & artist bio → see the real thing → next scene. | HARD | CONFIRMED |
| I2 | Exactly 6 discovery cards; each opens and closes by tap/click and keyboard. | HARD | CONFIRMED |
| I3 | Device-specific one-line hint, fading after ~4 s. | SOFT | CONFIRMED |
| I4 | Loading progress is shown while the scene loads. | HARD | CONFIRMED |
| I5 | Phone scene UI shows only Back + exclusive discovery; everything else under "More". | HARD | CONFIRMED |
| I6 | Exclusive discovery toggle is reversible and returns to the original state. | HARD | RECOMMENDED |
| I7 | Audio never autoplays; user can mute at any time. | HARD | RECOMMENDED |
| I8 | No console errors on load or during interaction. | HARD | RECOMMENDED |
| I9 | All GoatCounter events listed in 1.4 fire once at the right moment. | SOFT | RECOMMENDED |

### 4.4 Visual (V)

| ID | Rule | Gate | Status |
|---|---|---|---|
| V1 | Paintings are never cropped. Only exception: Orangerie *Water Lilies* thumbnail, labelled "局部 / detail". | HARD | CONFIRMED |
| V2 | Grids use justified rows; no grey letterbox around images. | SOFT | CONFIRMED |
| V3 | Chinese body serif stack: `"Songti SC", "STSong", "Noto Serif SC", "Source Han Serif SC", serif` (no full Chinese webfont download). English: EB Garamond / Source Serif 4. | HARD | CONFIRMED |
| V4 | Body text left-aligned, ~36em measure, line-height 1.75. | SOFT | CONFIRMED |
| V5 | Colours of the 3D scene stay faithful to the painting; `lighting` values are render-only and never displayed. | SOFT | CONFIRMED |
| V6 | New scene visually consistent with others of the same variant. | SOFT | RECOMMENDED |

### 4.5 Mobile (M)

| ID | Rule | Gate | Status |
|---|---|---|---|
| M1 | Tested at 390×844 (phone) and 820×1180 (tablet), plus desktop 1440×900. | HARD | RECOMMENDED |
| M2 | No horizontal scroll at 390 px width. | HARD | RECOMMENDED |
| M3 | Tap targets ≥ 44 × 44 px. | SOFT | RECOMMENDED |
| M4 | Viewport does not block zoom (no `maximum-scale`, no `user-scalable=no`). | HARD | CONFIRMED |
| M5 | Scene works with touch only (no hover-dependent actions). | HARD | RECOMMENDED |
| M6 | Checked in WeChat in-app browser before major releases. | SOFT | RECOMMENDED |
| M7 | Portrait and landscape orientation both usable. | SOFT | RECOMMENDED |

### 4.6 Performance (P)

| ID | Rule | Gate | Status |
|---|---|---|---|
| P1 | Each image ≤ 500 KB after compression. | HARD | CONFIRMED |
| P2 | No external CDN dependencies (site must work in mainland China). | HARD | CONFIRMED |
| P3 | Lighthouse mobile Performance ≥ 80 on the new scene page. | SOFT | DECISION (D3) |
| P4 | Scene interactive within 5 s on a simulated 4G phone. | SOFT | RECOMMENDED |

### 4.7 Accessibility (X)

| ID | Rule | Gate | Status |
|---|---|---|---|
| X1 | Text contrast ≥ 4.5:1. | HARD | CONFIRMED |
| X2 | Every artwork image has meaningful alt text (zh and en). | HARD | RECOMMENDED |
| X3 | All controls reachable and usable by keyboard with visible focus. | SOFT | RECOMMENDED |
| X4 | Respect `prefers-reduced-motion` (no forced camera motion). | SOFT | RECOMMENDED |
| X5 | No critical axe-core violations. | HARD | RECOMMENDED |

### 4.8 Copyright (C)

| ID | Rule | Gate | Status |
|---|---|---|---|
| C1 | Image comes only from an allowed source (2.4). | HARD | CONFIRMED |
| C2 | `imageSource` records file URL, licence and retrieval date. | HARD | CONFIRMED |
| C3 | No image URL or file from a forbidden domain anywhere in the repo. | HARD | CONFIRMED |
| C4 | Ambience sounds and music are original, CC0, or licensed for commercial use; source recorded. | HARD | RECOMMENDED |
| C5 | No museum logos or branding; museums linked by name only. | HARD | CONFIRMED |

---

## 5. Verification

### 5.1 Automated (build agent runs; script output saved) [RECOMMENDED]

| Check | Covers |
|---|---|
| JSON schema validation of `data/scenes.json` and `scene.json` | 2.2, I1, I2, L1 |
| Required zh + en for every text field | L1 |
| `imageSource` present; domain on allow-list; no forbidden domains in repo | C1–C3 |
| Room present ⇒ `lastVerified` present | A5 |
| Link check (internal + external; official URLs return 200) | A2, I1 |
| Image size ≤ 500 KB | P1 |
| No external CDN URLs in HTML/JS/CSS | P2 |
| Static HTML regenerated and matches data | I1 |
| Screenshots at 390×844, 820×1180, 1440×900 | G1, G2, G4, V1, M1, M2 |
| Console error capture during scripted walkthrough | I8 |
| Lighthouse (mobile) | P3 |
| axe-core | X1, X5 |
| Viewport meta check | M4 |

### 5.2 AI-assisted review (second agent, not the builder) [RECOMMENDED]

- Compare every fact in the text with the listed sources; report unsupported statements.
- Check zh/en meaning match and tone.
- Review screenshots for cropping, overlapping UI, unreadable text.

### 5.3 Human review (Tia) [CONFIRMED]

- Reads final zh and en text.
- Opens the live preview on her phone.
- Approves or rejects.

---

## 6. Deliverables per artwork

### 6.1 Content
- Research pack (2.2) saved with the scene or in the PR description.

### 6.2 Code
- `scenes/<slug>/` with `scene.json` and assets.
- Entry in `data/scenes.json`.
- Updates to artist, museum, theme, city, series and "next scene" links.
- Regenerated static HTML.

### 6.3 Evidence
- Automated check log.
- Three screenshots (phone, tablet, desktop) of: first screen, inside scene, exclusive discovery on.

### 6.4 Delivery report (short, in PR description)
1. What was added / changed (files).
2. Check results: all HARD passed? list of SOFT failures with reasons.
3. Open questions for Tia (unverified facts, missing size, room unknown).
4. Anything changed outside the new scene.

---

## 7. Failure handling

| Situation | Action |
|---|---|
| Fact cannot be verified | Remove it or hedge it; list in report. Never guess. |
| Size or date missing on official page | Leave field empty; flag in report. |
| Sources conflict | Use owner museum's version; note the conflict. |
| Room cannot be verified | Hide room; show museum only. |
| No allowed image | Stop. Do not build. Tell Tia. |
| HARD check fails | Do not merge. Fix or ask Tia. |
| SOFT check fails | May publish; list in report with follow-up. |
| Change breaks another scene | Revert that change; report. |
| Live page found wrong after publish | Fix within one week; log in changelog. |

---

## 8. Approval rules

| Action | Who decides |
|---|---|
| Choosing a new artwork / new artist | Tia |
| New theme, series or navigation item | Tia |
| Merging to the live site | Tia (no auto-merge — see D4) |
| New image source domain | Tia |
| Text fixes (typos, formatting) on existing scenes | Agent may fix; listed in report |
| Factual changes on existing scenes | Tia |
| Social media drafts | Agent drafts; Tia edits and posts |
| Changes to About, brand lines or credits | Tia |

Credit on site: "由 Tia 创作与策划 / Created and curated by Tia" only. No AI-tool credits on the site. No real names other than "Tia" in any project file. [CONFIRMED]

---

## 9. Acceptance checklist

### 9.1 HARD — all must be ✅ before merge

- [ ] Eligibility (2.1) met
- [ ] Every fact sourced; owner details match official page (A1–A3)
- [ ] Interpretations hedged (A4)
- [ ] Room shown only if verified with date; owner vs display location correct (A5, A6)
- [ ] All text bilingual; sensitive topics handled; illustration label present where needed (L1, L6, L7)
- [ ] Scene skeleton complete; 6 discovery cards; loading progress; phone UI minimal (I1, I2, I4, I5)
- [ ] Exclusive toggle reversible; no audio autoplay; no console errors (I6–I8)
- [ ] Painting uncropped; correct font stacks (V1, V3)
- [ ] Tested at 3 sizes; no horizontal scroll; zoom not blocked; works by touch (M1, M2, M4, M5)
- [ ] Images ≤ 500 KB; no external CDN (P1, P2)
- [ ] Contrast ≥ 4.5:1; alt text; no critical axe issues (X1, X2, X5)
- [ ] Image from allowed source with full `imageSource`; no forbidden domains; sound licensed; no logos (C1–C5)
- [ ] Static HTML regenerated
- [ ] Delivery report complete
- [ ] Tia approved

### 9.2 SOFT — list any ❌ in the report

- [ ] Room/loan re-verified within 90 days (A7)
- [ ] Plain language, length limits, formatting conventions (L2–L5, L8)
- [ ] Hint fades; analytics events fire (I3, I9)
- [ ] Justified grids; body text measure; faithful colours; consistent with variant (V2, V4–V6)
- [ ] Tap targets; WeChat browser; orientations (M3, M6, M7)
- [ ] Lighthouse ≥ 80; interactive < 5 s (P3, P4)
- [ ] Keyboard focus; reduced motion (X3, X4)

---

## 10. Open decisions for Tia

| ID | Question | Default until decided |
|---|---|---|
| D1 | Metric targets: step-inside ≥ 50%, ending ≥ 30%? | Track only, no targets |
| D2 | Re-verify room/loan info every 90 days? | Yes, SOFT |
| D3 | Lighthouse mobile Performance threshold 80? | 80, SOFT |
| D4 | Allow auto-merge for typo-only fixes? | No |
| D5 | Who owns the research pack: Tia, the research assistant, or the build agent? | Tia + research assistant; build agent never writes facts |
| D6 | Is any commercial use planned (affects image and sound licences)? | Treat as possibly commercial: avoid NC licences |
| D7 | Are audio guides required for every new scene, or optional? | Optional |
