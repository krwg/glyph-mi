# glyph-mi — technical roadmap

Universal metadata intelligence core — rules → knowledge → ML → KNN → optional Ollama.

## Current strengths

- Pipeline: rules → knowledge → ML heuristics → KNN → Ollama fallback
- SQLite logging with 60-day decay
- `notes` module for Obsidian/Cultiva convergence

## Priority backlog

### Week 3

- **npm package** `@floke/glyph-mi` — `npm install` for Cultiva and third-party apps (today: vendored / mirror only)

### Month 2

| Item | Description |
|------|-------------|
| **ONNX model** | `train-glyph-genre.py` + 500+ rows in `glyph-log.sqlite` → ship `.onnx`; promote `ml-heuristic.js` to real ML |
| **KNN in main process** | Move `tracks_features` out of renderer; IPC via `glyph-db.cjs` for 10k+ libraries |
| **Pipeline diagram** | ASCII flow in README (GUIDE.ru.md exists; add visual in EN README) |

## Pipeline (target diagram for README)

```
Input (track / note / habit)
        │
        ▼
   Rule engine ──► fast tags, stop-words
        │
        ▼
 Knowledge base ──► genre/mood lexicon
        │
        ▼
 ML heuristic ──► ONNX (planned) / heuristics today
        │
        ▼
 KNN neighbors ──► similar items (IPC in main process)
        │
        ▼
 Ollama (optional) ──► enrich when local LLM available
        │
        ▼
 confidence + sources + hints.fallbackReason
```

## Links

- [glyph-miO](https://github.com/FlokeStudio/glyph-miO) — Obsidian plugin
- [Cultiva](https://github.com/krwg/cultiva) — desktop consumer (glyph-s 2.7.2 search)
