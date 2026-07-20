#!/usr/bin/env python3
"""Train a tiny genre/mood classifier and export ONNX for glyph-mi.

Usage:
  python scripts/train-glyph-genre.py --db glyph-log.sqlite --out models/glyph-genre-mood-v1.onnx

Requires 500+ labeled rows in glyph-log.sqlite (genre column). Falls back with exit code 2 when
the dataset is too small — heuristics remain the default runtime path.
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

MIN_ROWS = 500


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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="glyph-log.sqlite")
    parser.add_argument("--out", default="models/glyph-genre-mood-v1.onnx")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"database not found: {db_path}", file=sys.stderr)
        return 1

    rows = load_rows(db_path)
    if len(rows) < MIN_ROWS:
        print(
            f"need at least {MIN_ROWS} labeled tracks, found {len(rows)} — keep heuristics",
            file=sys.stderr,
        )
        return 2

    try:
        import numpy as np
        from sklearn.ensemble import RandomForestClassifier
        from skl2onnx import convert_sklearn
        from skl2onnx.common.data_types import FloatTensorType
    except ImportError:
        print("install numpy scikit-learn skl2onnx to export ONNX", file=sys.stderr)
        return 1

    genres = sorted({str(r[2]).strip() for r in rows})
    genre_to_idx = {g: i for i, g in enumerate(genres)}

    X = []
    y = []
    for bpm, energy, genre, title, artist in rows:
        X.append([
            float(bpm or 0),
            float(energy or 0),
            float(len(str(title or ""))),
            float(len(str(artist or ""))),
        ])
        y.append(genre_to_idx[str(genre).strip()])

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int64)

    clf = RandomForestClassifier(n_estimators=64, random_state=42)
    clf.fit(X, y)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    initial_type = [("float_input", FloatTensorType([None, 4]))]
    onnx_model = convert_sklearn(clf, initial_types=initial_type)
    with open(out_path, "wb") as fh:
        fh.write(onnx_model.SerializeToString())

    print(f"exported {out_path} from {len(rows)} rows · {len(genres)} genres")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
