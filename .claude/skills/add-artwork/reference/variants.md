# Variant cheat sheet

Rules live in `assets/variants.js` and `tools/check_scenes.py`; this is a summary.

| variant | Program | Start by copying | Extra fields | Example exclusive `type` |
|---|---|---|---|---|
| `interior` | `assets/engine.js` (3D walk) | `scenes/bedroom/` | `viewpoint`, `room`, `objects` (kinds in engine.js `BUILD`), `zoom` | `wallFade` |
| `outdoor` | `assets/engine.js` (3D, sky/wind) | `scenes/yellow-house/` | `viewpoint`, `room`, `objects`, `projection`, `zoom` | `fadeObject` |
| `still-life` | `assets/light.js` (layered 2D) | `scenes/sunflowers/` | `kind: "light"`, `layers`, `spots`, `parallax`, `zoom` | `map` |
| `portrait` | `assets/light.js` (+ detail zoom) | `scenes/painter-of-sunflowers/` | `kind: "light"`, `layers`, `spots`, `parallax`, `zoom` | `slider` |

Card counts `check_scenes.py` allows: 3D 5–7, light 3–6. The spec asks new scenes for exactly 6.

All variants: 3 acts, `ending.final`, one unique `exclusive`, `ambience`, `lighting`, `links`, `sources`, `imageSource`, `lastVerified`.

Page IDs the checker uses: `#introImg` (opening painting), `#enter`, `#tools`, `#moreBtn` (phone "More"), `.spot` (light hotspots), `#card` / `#cardClose`, `#endBtn`, `#actEnd`, `#loadState` (3D loading bar). 3D cards can be opened with `?card=<key>`.
