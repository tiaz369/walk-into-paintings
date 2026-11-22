# Research pack checklist (quality-standards.md 2.2)

Tia + research assistant fill this in. The build agent only checks it and asks about gaps; it never fills facts itself.

| Field | Where it goes | Notes |
|---|---|---|
| Title zh / en | registry `title`, scene `label.title` | English exactly as on the owner's page |
| Artist + dates zh / en | registry `artist` (id), `data/scenes.json` → `artists`, scene `record` | |
| Date | registry `year`, `label` | Owner's form, e.g. "about 1881–6" |
| Medium, size (cm) | scene `record` | From the owner's page. Missing → empty + flag |
| Owner / credit line | registry `museum`, scene `record` | |
| Official artwork URL | registry `artworkUrl`, scene `record.url`, `sources` | Must be in `sources` (A1 check) |
| On display / room / loan | registry `onDisplay`, `room`, `roomVerified` | Room only with a verified date |
| Variant | scene `variant` | interior / outdoor / still-life / portrait |
| Themes, period, mood, place | registry | Existing taxonomy only; new theme needs Tia |
| Artist bio zh / en | `data/scenes.json` → `artists` | 2–3 sentences |
| 6 discovery cards zh / en | scene `cards` (+ `spots` for light scenes) | Title + 1–2 sentences |
| Story, three acts | scene `ending.acts` | Three short paragraphs |
| Final line zh / en | scene `ending.final` | |
| Exclusive discovery | scene `exclusive` | "这是示意" if it alters the original |
| Ambience | scene `ambience` | Name from `assets/sound.js` AMBIENCE; music optional (CC0/PD only) |
| Links to other scenes | scene `links`, series `order` | |
| Sources | scene `sources`, `sources.md` | At least one official museum source |
| Image source | scene `imageSource` (+ `files`), `images/README.md` | File URL, licence, retrieval date |
