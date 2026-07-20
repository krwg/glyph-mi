#!/usr/bin/env python3
"""Train a tiny genre classifier and export ONNX for glyph-mi.

Feature contract (must match js/core/glyph-onnx.js):
  [bpm, energy, title_len, artist_len]  — float32, shape [N, 4]

Labels are written beside the model as genre-labels.json (index → genre string).

Usage:
  python scripts/train-glyph-genre.py --db glyph-log.sqlite --out models/glyph-genre-mood-v1.onnx

Requires 500+ labeled rows by default (override with --min-rows). Falls back with
exit code 2 when the dataset is too small — heuristics remain the default runtime path.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

MIN_ROWS = 500
FEATURE_DIM = 4
FEATURE_NAMES = ["bpm", "energy", "title_len", "artist_len"]


def load_rows(db_path: Path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT bpm, energy, genre, title, artist
        FROM tracks
        WHERE genre IS NOT NULL AND TRIM(genre) != ''
        """
    )
    rows = cur.fetchall()
    conn.close()
    return rows


def build_matrix(rows):
    """Return (X rows, y indices, genres list sorted)."""
    genres = sorted({str(r[2]).strip() for r in rows})
    genre_to_idx = {g: i for i, g in enumerate(genres)}
    X = []
    y = []
    for bpm, energy, genre, title, artist in rows:
        X.append(
            [
                float(bpm or 0),
                float(energy or 0),
                float(len(str(title or ""))),
                float(len(str(artist or ""))),
            ]
        )
        y.append(genre_to_idx[str(genre).strip()])
    return X, y, genres


def write_labels(out_path: Path, genres: list[str]) -> Path:
    labels_path = out_path.with_name("genre-labels.json")
    payload = {
        "featureNames": FEATURE_NAMES,
        "featureDim": FEATURE_DIM,
        "labels": genres,
    }
    labels_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return labels_path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="glyph-log.sqlite")
    parser.add_argument("--out", default="models/glyph-genre-mood-v1.onnx")
    parser.add_argument("--min-rows", type=int, default=MIN_ROWS)
    parser.add_argument(
        "--export-matrix",
        metavar="PATH",
        help="Write feature matrix + labels JSON and exit (no sklearn/ONNX required)",
    )
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"database not found: {db_path}", file=sys.stderr)
        return 1

    rows = load_rows(db_path)
    if len(rows) < args.min_rows:
        print(
            f"need at least {args.min_rows} labeled tracks, found {len(rows)} — keep heuristics",
            file=sys.stderr,
        )
        return 2

    X, y, genres = build_matrix(rows)

    if args.export_matrix:
        export_path = Path(args.export_matrix)
        export_path.parent.mkdir(parents=True, exist_ok=True)
        export_path.write_text(
            json.dumps(
                {
                    "featureNames": FEATURE_NAMES,
                    "featureDim": FEATURE_DIM,
                    "features": X,
                    "y": y,
                    "labels": genres,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        print(f"exported matrix {export_path} · {len(X)} rows · {len(genres)} genres")
        return 0

    try:
        import numpy as np
        from sklearn.ensemble import RandomForestClassifier
        from skl2onnx import convert_sklearn
        from skl2onnx.common.data_types import FloatTensorType
    except ImportError:
        print("install numpy scikit-learn skl2onnx to export ONNX", file=sys.stderr)
        return 1

    X_arr = np.array(X, dtype=np.float32)
    y_arr = np.array(y, dtype=np.int64)

    clf = RandomForestClassifier(n_estimators=64, random_state=42)
    clf.fit(X_arr, y_arr)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    initial_type = [("float_input", FloatTensorType([None, FEATURE_DIM]))]
    onnx_model = convert_sklearn(clf, initial_types=initial_type)
    with open(out_path, "wb") as fh:
        fh.write(onnx_model.SerializeToString())

    labels_path = write_labels(out_path, genres)
    print(
        f"exported {out_path} + {labels_path.name} from {len(rows)} rows · {len(genres)} genres"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
