# Changelog

All notable changes to **glyph-mi** are documented here.

The public JS contract surface is versioned by `GLYPH_MI_API_VERSION` in
`js/universal/contracts.js` (mirrored in `pyproject.toml` where applicable).

## API compatibility policy

`GLYPH_MI_API_VERSION` follows **semver-like** rules for the universal contract:

| Change type | Version bump | Examples |
|-------------|--------------|----------|
| **Breaking** | Major (`X.0.0`) | Renaming/removing `normalizeInput` / `normalizeResult` fields; changing required shapes; removing a registered `moduleId` without a documented migration; changing default `moduleId` behavior in a way that alters existing callers |
| **Non-breaking** | Minor (`x.Y.0`) | New product modules; new optional input/result fields; new `hints.*` keys; new capabilities on manifests |
| **Patch** | Patch (`x.y.Z`) | Bug fixes, docs, tests, internal heuristic tweaks that keep the same field names and types |

**Consumers should:**

- Read `apiVersion` on every normalized result.
- Treat unknown `hints.*` keys as optional (forward-compatible).
- Treat unknown `moduleId` values as “may fall back” — see `hints.fallbackReason`.
- Pin to a major when embedding; minor/patch upgrades within the same major are intended to be drop-in.

**Not covered by `GLYPH_MI_API_VERSION`:** Python CLI flags, knowledge pack JSON schemas (versioned separately in filenames), and Obsidian plugin UX.

---

## [2.7.1] — 2026-07-19

### Added

- **`notes` module** (`js/modules/notes/`) — real `normalizeInput` → pipeline → `normalizeResult` path for textual notes (title / headings / body), with tag-scoring heuristics and extractive summary stubs for glyph-miO convergence. Alias: `moduleId: 'text'`.
- Machine-readable **`hints.fallbackReason`** when `analyzeUniversal` cannot resolve a module and routes to the default senza analyzer (`hints.fallback: true`).
- **`CHANGELOG.md`** and API compatibility policy for `GLYPH_MI_API_VERSION`.
- Minimal **`node:test`** suite (`test/contracts.test.js`) for empty-track normalization, unknown-module fallback, and notes pipeline basics.
- Spectral optional-extra **degradation** signal in Python `analyze_one` when a file path is present but local spectral analysis is unavailable (`hints.degradation: 'spectral-unavailable'`).

### Documented

- Spectral `[spectral]` optional extra: without it, BPM/genre-from-audio signals are skipped and confidence lacks spectral reasons (graceful degradation).
- glyph-miO ships the vendored `notes` module in 2.8.0 (`vendor/glyph-mi-notes.cjs`).

### Changed

- `GLYPH_MI_API_VERSION` → `2.7.1` (non-breaking additive).

---

## [2.7.0] — prior

- Universal contracts (`normalizeInput` / `normalizeResult`).
- Module routing: `senza` (active), `cultiva` (scaffold).
- Senza adapter over existing `analyzeTrackFull` pipeline.
