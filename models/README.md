# Glyph ONNX models (optional)

Place trained models here for Electron / Node inference (`js/core/glyph-onnx.js`):

- `glyph-genre-mood-v1.onnx` — input float32 `[1, 4]`
- `genre-labels.json` — label map written by the train script (required beside the `.onnx`)

## Feature contract

Train (`scripts/train-glyph-genre.py`) and inference (`js/core/glyph-onnx.js`) share:

| Index | Feature       | Source                         |
|-------|---------------|--------------------------------|
| 0     | `bpm`         | numeric BPM                    |
| 1     | `energy`      | numeric energy                 |
| 2     | `title_len`   | `len(title)`                   |
| 3     | `artist_len`  | `len(artist)`                  |

`genre-labels.json` shape:

```json
{
  "featureNames": ["bpm", "energy", "title_len", "artist_len"],
  "featureDim": 4,
  "labels": ["Ambient", "Electronic", "..."]
}
```

Label order is the sorted unique genre strings from the training DB — not a fixed 8/10 list.
Without a model (or without `genre-labels.json`), Glyph uses `ml-heuristic.js`.

## Training workflow

1. **Collect features** — run analysis in a consumer app so `glyph-log.sqlite` accumulates at least 500 labeled rows (`bpm`, `energy`, `title`, `artist`, `genre`).
2. **Export training matrix** (optional, no sklearn) —  
   `python scripts/train-glyph-genre.py --db glyph-log.sqlite --min-rows 1 --export-matrix /tmp/matrix.json`
3. **Train + export ONNX** —  
   `python scripts/train-glyph-genre.py --db glyph-log.sqlite --out models/glyph-genre-mood-v1.onnx`  
   This also writes `models/genre-labels.json`.
4. **Validate** — hold out 20% of rows; target macro-F1 above baseline heuristics before shipping.
5. **Ship** — include the `.onnx` and `genre-labels.json` in app releases; the npm package ships this directory placeholder only.

Install optional runtime: `npm install onnxruntime-node` (native; run postinstall in the consuming app after install).
