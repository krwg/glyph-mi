# glyph-mi Repository Note

`glyph-mi` is the universal metadata intelligence core in Glyph 2.7.

- Main docs: `README.md`
- Changelog / API policy: `CHANGELOG.md`
- Site: https://krwg.github.io/glyph-mi/
- Universal entry: `js/universal/engine.js`
- Active modules: `js/modules/senza/`, `js/modules/notes/`
- Cultiva foundation: `js/modules/cultiva/` (scaffold)

## Modules

| moduleId | Status | Notes |
|----------|--------|-------|
| `senza` | active | Music pipeline (tags, spectral, kNN, local-agent) |
| `notes` (`text` alias) | active | Title / headings / body → tags + extractive summary |
| `cultiva` | scaffold | Foundation only |

Unknown `moduleId` → default senza analyzer with `hints.fallback` + `hints.fallbackReason`.

## Spectral optional extra

Python: `pip install -e ".[spectral]"` enables local librosa BPM/energy/genre hints. Without it, analysis still runs; spectral signals are omitted and confidence does not get spectral boosts (`hints.degradation` / reason string when a file path was analyzed).

## glyph-miO / vendoring roadmap

- **glyph-miO** currently ships its own `services/metadata.js` + `services/summary.js`. It should **converge** on this repo’s `notes` module (`analyzeUniversal({ moduleId: 'notes', note|track })`) so heuristics stay in one place.
- **glyph-sO** already vendors [`glyph-s`](https://github.com/FlokeStudio/glyph-s) under `vendor/`. That pattern does **not** yet apply to **glyph-mi vs glyph-miO** — miO is still a parallel implementation.
- **Roadmap:** vendor or otherwise consume `glyph-mi` from glyph-miO (similar to sO ↔ s), then delete duplicated note services.
