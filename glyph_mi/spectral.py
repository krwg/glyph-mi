"""Local spectral analysis — BPM, energy, genre hints (optional librosa)."""

from __future__ import annotations

from typing import Any


def _genre_from_features(bpm: float, energy: float, brightness: float) -> str:
    if bpm >= 140 and energy > 0.17:
        return "Dance"
    if bpm >= 128 and energy > 0.18:
        return "Electronic"
    if energy > 0.16 and bpm >= 115:
        return "Rock"
    if energy < 0.09 and bpm < 105:
        return "Ambient"
    if energy < 0.12 and bpm < 100:
        return "Jazz"
    if energy > 0.14:
        return "Pop"
    return "Unknown"


def analyze_spectral(file_path: str) -> dict[str, Any] | None:
    """
    Analyze audio file locally. Returns None if librosa unavailable or read fails.
    """
    try:
        import librosa
        import numpy as np
    except ImportError:
        return None

    try:
        y, sr = librosa.load(file_path, duration=60.0, mono=True)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(np.atleast_1d(tempo)[0])
        rms = float(np.mean(librosa.feature.rms(y=y)))
        cent = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
        energy = min(0.35, max(0.05, rms * 4.0))
        brightness = float(cent)
        if not (40 <= bpm <= 240):
            bpm = 120.0
        genre = _genre_from_features(bpm, energy, brightness)
        return {
            "bpm": int(round(bpm)),
            "bpmSource": "librosa",
            "energy": round(energy, 3),
            "brightness": int(round(brightness)),
            "genreHint": genre,
            "provider": "glyph-spectral",
        }
    except Exception:
        return None
