# Glyph ONNX models (optional)

Place trained models here for Electron inference (`glyph-onnx.cjs`):

- `glyph-genre-mood-v1.onnx` — input `[bpm/200, energy, brightness/5000]`, genre logits

Without a model, Glyph uses the built-in `ml-heuristic.js` layer (no extra install).

## Training workflow

1. **Collect features** — run analysis in a dev build so `glyph-log.sqlite` accumulates at least 500 labeled rows (`bpm`, `energy`, `brightness`, genre/mood labels from user corrections or rules consensus).
2. **Export training matrix** — extract numeric features and class indices only; do not commit SQLite files or raw titles/artists to the repo.
3. **Train** — use `train-glyph-genre.py` (sklearn or PyTorch) with 10 genre classes matching `glyph-onnx.cjs` label order.
4. **Validate** — hold out 20% of rows; target macro-F1 above baseline heuristics before shipping.
5. **Export ONNX** — write `glyph-genre-mood-v1.onnx` into this directory; verify input/output tensor names match the Electron loader.
6. **Ship** — include the `.onnx` in app releases; npm package ships the directory placeholder only.

Install optional runtime: `npm install onnxruntime-node` (native; run postinstall in the consuming app after install).
