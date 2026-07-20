# glyph-mi — technical roadmap

Universal metadata intelligence core — rules → knowledge → ML → KNN → optional Ollama.

## Current strengths

- Pipeline: rules → knowledge → ML heuristics → KNN → Ollama fallback
- SQLite logging with 60-day decay
- `notes` module for Obsidian/Cultiva convergence

## Shipped (2.8.0)

| Item | Notes |
|------|-------|
| **npm package** `@floke/glyph-mi` | Public package metadata, `files` field, lint/test scripts — publish-ready (not yet on registry) |
| **Pipeline diagram** | ASCII flow in [README.md](README.md) |
| **KNN IPC module** | `js/core/knn-ipc.js` — in-process `createKnnIpcHandler(dbPath)` with `query` / `loadFeatures`; Electron apps wrap via `glyph-db.cjs` |

## Priority backlog

### Month 2

| Item | Description |
|------|-------------|
| **ONNX model** | `train-glyph-genre.py` + 500+ rows in `glyph-log.sqlite` → ship `.onnx`; promote `ml-heuristic.js` to real ML |
| **KNN in main process** | Wire `createKnnIpcHandler` through Electron IPC; move `tracks_features` out of renderer for 10k+ libraries |

## Pipeline (README diagram)

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
