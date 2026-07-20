<p align="center">
  <img src="docs/assets/glyph-transparent.png" width="88" alt="Glyph" />
</p>

<h1 align="center">glyph-mi 2.8</h1>

<p align="center">
  <strong>Glyph Metadata Intelligence</strong><br>
  Universal analysis core with product modules
</p>

<p align="center">
  <a href="https://krwg.github.io/glyph-mi/">Site</a> ·
  <a href="GUIDE.ru.md">GUIDE.ru</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="https://github.com/FlokeStudio/glyph-miO">glyph-miO</a> ·
  <a href="https://github.com/FlokeStudio/glyph-s">glyph-s</a>
</p>

---

## User section

### What is glyph-mi?

**glyph-mi** is the **metadata intelligence core** of the Glyph family. It analyzes content — music tracks, notes, documents — and returns structured metadata: suggested tags, confidence scores, spectral features, and contextual hints.

In 2.8, glyph-mi ships as an **npm package** (`@floke/glyph-mi`) with an in-process KNN IPC handler for library-neighbor queries. In 2.7, glyph-mi evolved from a Senza-specific pipeline into a **universal core** with pluggable product modules. Senza behavior is preserved; notes analysis is first-class; new products (like Cultiva) can plug in without forking the codebase.

### Who is this for?

| Audience | What you need |
|----------|---------------|
| **Senza users** | glyph-mi runs inside Senza automatically — tags, metadata, spectral analysis |
| **Obsidian users** | Install [**glyph-miO**](https://github.com/FlokeStudio/glyph-miO) — note-focused; should converge on this repo’s `notes` module |
| **Developers** | Use `analyzeUniversal()` to integrate MI into your own product |

### What’s new in 2.8.0

- **`@floke/glyph-mi` npm package** — publish-ready metadata, lint/test scripts, public `files` manifest
- **`createKnnIpcHandler(dbPath)`** — in-process KNN with `query(vector, k)` and `loadFeatures(rows)`; Electron apps (Senza, Cultiva) wrap this via `glyph-db.cjs` IPC
- **Expanded tests** — `knn-ipc.test.js`, `batch.test.js`

### What’s new in 2.7.1

- **`notes` module** — title / headings / body → tag scores + extractive summary (for glyph-miO)
- **`hints.fallbackReason`** when an unknown `moduleId` falls back to senza
- **CHANGELOG** + API compatibility policy for `GLYPH_MI_API_VERSION`
- Docs: spectral optional-extra degradation; mi ↔ miO vendoring roadmap

### Universal contracts (`js/universal/contracts.js`)

- `normalizeInput(input)` — canonical input shape: `track` / `note`, `context`, `moduleId`
- `normalizeResult(base)` — canonical output: `fields`, `confidence`, `sources`, `hints`
- `GLYPH_MI_API_VERSION = '2.8.0'` — versioned API surface (see [CHANGELOG.md](CHANGELOG.md))

**Module routing** (`js/universal/engine.js`):

```js
import { analyzeUniversal, listGlyphModules } from './js/index.js';

const result = await analyzeUniversal(
  { track: { path: '/music/track.flac', title: 'Song' }, context: { app: 'senza' } },
  { moduleId: 'senza' }
);

const noteResult = await analyzeUniversal(
  {
    moduleId: 'notes',
    note: {
      title: 'Garden Log',
      body: '# Beds\nTomato plants need morning sun…',
      headings: ['Beds'],
    },
  },
  { moduleId: 'notes' }
);
```

**Product modules:**

| Module | Status | Product | Capabilities |
|--------|--------|---------|--------------|
| `senza` | **Active** | Senza music library | tags, metadata, spectral, kNN, local-agent |
| `notes` (`text` alias) | **Active** | glyph-miO / notes | tags, headings, summary, metadata |
| `cultiva` | Foundation | Cultiva (future) | scaffold — manifest + handler stub |

**Senza adapter** — wraps the existing `analyzeTrackFull()` pipeline through universal contracts. Zero breaking changes for Senza integrations.

**Notes module** — real pipeline (not a scaffold): tag-scoring heuristics + extractive summary stubs structured for glyph-miO to consume.

**Cultiva foundation** — scaffold module with manifest, placeholder handler, and knowledge pack at `knowledge/public/cultiva-foundation-v1.json`. Ready for future product wiring.

**Module introspection:**

```js
import { listGlyphModules, resolveGlyphModule } from './js/index.js';

listGlyphModules();
// [{ moduleId: 'senza', ... }, { moduleId: 'notes', ... }, { moduleId: 'cultiva', ... }]

resolveGlyphModule('notes');
// { moduleId, label, enabledByDefault, capabilities, product }
```

### How analysis works

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

1. **Input normalization** — track or note fields (`title`, `headings`, `body`, path, glyph features)
2. **Module pipeline** — senza music pipeline, or notes tag/summary pipeline
3. **Result normalization** — confidence score, field map, source attribution, hints
4. **Fallback** — unknown `moduleId` routes to default analyzer with `hints.fallback: true` and machine-readable `hints.fallbackReason`

### Spectral optional extra (degradation)

```bash
pip install -e ".[spectral]"
```

When the optional `[spectral]` extra (librosa) is **not** installed, or analysis fails:

- Rules / knowledge / filename heuristics still run
- BPM / energy / genre-from-audio are **skipped**
- Confidence **does not** receive spectral boosts (graceful degradation)
- Python `analyze_one` may set `hints.spectralAvailable: false` and `hints.degradation: 'spectral-unavailable'`

Precomputed `glyphFeatures` in context still apply when present (e.g. from Senza import).

### Pair with glyph-s / glyph-miO

| glyph-s | glyph-mi |
|---------|----------|
| Finds content across your library | Understands individual items |
| Full-text search, ranking, snippets | Tags, metadata, spectral / note features |
| [glyph-sO](https://github.com/FlokeStudio/glyph-sO) vendors glyph-s | [glyph-miO](https://github.com/FlokeStudio/glyph-miO) should converge on `notes` — **not yet vendored** |

**Roadmap:** glyph-sO already vendors `glyph-s`. That pattern does **not** yet apply to glyph-mi vs glyph-miO (miO still has local `services/`). Plan: have miO call this `notes` module / vendor `@floke/glyph-mi`, then drop duplicated heuristics.

### Install (npm)

```bash
npm install @floke/glyph-mi
```

```js
import { analyzeUniversal, createKnnIpcHandler } from '@floke/glyph-mi';

const knn = createKnnIpcHandler('/path/to/glyph-log.sqlite');
knn.loadFeatures(libraryRows);
const neighbors = knn.query(titleVector, 8);
```

In Electron, the main process exposes the same handler over IPC (`glyph-db.cjs`); the npm module is the in-process implementation used by that bridge.

Obsidian users: install [**glyph-miO**](https://github.com/FlokeStudio/glyph-miO) for note-focused analysis that should converge on this repo’s `notes` module.

---

## GitHub / Dev section

### Architecture

```
js/
  universal/
    contracts.js          # normalizeInput, normalizeResult, API version
    engine.js             # analyzeUniversal, listGlyphModules, module routing
  modules/
    senza/
      index.js            # analyzeForSenza, SENZA_MODULE_MANIFEST
    notes/
      index.js            # analyzeForNotes, NOTES_MODULE_MANIFEST
      pipeline.js         # tag scoring + extractive summary
      manifest.json
    cultiva/
      index.js            # analyzeForCultivaFoundation (scaffold)
      manifest.json
  providers/
    mi.js                 # default analyzeMI fallback
  pipeline.js             # Senza full analysis pipeline
  index.js                # public exports
test/
  contracts.test.js       # node:test — normalize + fallback + notes
  knn-ipc.test.js         # KNN IPC handler neighbors
  batch.test.js           # analyzeBatch array results
knowledge/
  public/
    cultiva-foundation-v1.json   # Cultiva knowledge pack placeholder
```

### Module registry

Modules are registered in `js/universal/engine.js`:

```js
const MODULE_HANDLERS = {
  senza: analyzeForSenza,
  cultiva: analyzeForCultivaFoundation,
  notes: analyzeForNotes,
  text: analyzeForNotes,
};

const MODULE_MANIFESTS = {
  senza: SENZA_MODULE_MANIFEST,
  cultiva: CULTIVA_MODULE_MANIFEST,
  notes: NOTES_MODULE_MANIFEST,
};
```

To add a new product module:

1. Create `js/modules/<product>/index.js` with handler + manifest
2. Register in `MODULE_HANDLERS` and `MODULE_MANIFESTS`
3. Implement `normalizeInput` → analysis → `normalizeResult` flow

### Input contract

```js
{
  moduleId: 'senza' | 'notes' | 'text' | 'cultiva',
  track: {
    id, path, title, artist, album, genre, year, trackNo,
    body, headings,              // notes-oriented (optional)
    glyphFeatures,               // spectral / glyph data
  },
  note: {                        // optional alias for notes module
    title, body, headings, path, frontTags,
  },
  context: {
    folderHint, siblingTracks, tags, app,
  },
}
```

### Result contract

```js
{
  apiVersion: '2.8.0',
  moduleId: 'senza' | 'notes' | 'cultiva',
  provider: 'glyph-mi',
  fields: { /* product-specific metadata */ },
  confidence: { score: 0.85, reasons: ['…'] },
  sources: [/* attribution */],
  hints: {
    /* optional guidance */
    fallback?: true,
    fallbackReason?: 'unknown moduleId "…", routed to default senza analyzer',
  },
}
```

### Install (development)

```bash
git clone https://github.com/krwg/glyph-mi.git
cd glyph-mi

# JavaScript (ESM — no build step)
node -e "import('./js/index.js').then(m => console.log(m.listGlyphModules()))"
npm test

# Python
pip install -e ".[spectral]"
```

### Project layout

| Path | Role |
|------|------|
| `js/universal/contracts.js` | API version, input/output normalization |
| `js/universal/engine.js` | Universal entry, module routing, fallback |
| `js/modules/senza/` | Senza adapter (active) |
| `js/modules/notes/` | Notes adapter (active) |
| `js/modules/cultiva/` | Cultiva foundation (scaffold) |
| `js/pipeline.js` | Senza analysis pipeline |
| `test/` | Minimal node:test suite |
| `CHANGELOG.md` | Releases + API compatibility policy |
| `knowledge/public/` | Knowledge packs for modules |
| `pyproject.toml` | Python package metadata (v2.8.0) |
| `docs/index.html` | GitHub Pages landing |

### Related repositories

| Repo | Role |
|------|------|
| [glyph-miO](https://github.com/FlokeStudio/glyph-miO) | Obsidian plugin — converge on `notes` module |
| [glyph-s](https://github.com/FlokeStudio/glyph-s) | Shared search engine |
| [glyph-sO](https://github.com/FlokeStudio/glyph-sO) | Obsidian search plugin (vendors glyph-s) |

### License

GPL-3.0-or-later · krwg
