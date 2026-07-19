"""Glyph MI analyze API."""

from __future__ import annotations

from glyph_mi.confidence import build_confidence
from glyph_mi.knowledge import apply_knowledge
from glyph_mi.rules import analyze_rules, merge_fields, split_artists
from glyph_mi.spectral import analyze_spectral


def analyze_one(inp: dict) -> dict:
    """
    Analyze a single track.

    inp: { filePath, tags?, context? }
    returns: { fields, confidence, provider, sources, hints }
    """
    file_path = inp.get("filePath") or ""
    tags = inp.get("tags") or {}
    context = inp.get("context") or {}

    base = analyze_rules(file_path, tags, context)
    merged = dict(base["fields"])
    reasons = list(base["confidence"].get("reasons") or [])

    merged = apply_knowledge(file_path, tags, merged, reasons)
    sources = list(base.get("sources") or ["glyph-rules"])

    spectral = context.get("glyphFeatures") or (
        analyze_spectral(file_path) if file_path else None
    )
    spectral_unavailable = False
    if spectral:
        if not merged.get("genre") and spectral.get("genreHint"):
            merged["genre"] = spectral["genreHint"]
            reasons.append("glyph-spectral: genre from spectrum")
        if "glyph-spectral" not in sources:
            sources.append("glyph-spectral")
    elif file_path and not context.get("glyphFeatures"):
        # Optional [spectral] extra missing, or librosa failed — degrade gracefully.
        spectral_unavailable = True
        reasons.append(
            "glyph-spectral: unavailable (optional [spectral] extra missing or audio analysis failed)"
        )

    if not merged.get("artists") and merged.get("artist"):
        merged["artists"] = split_artists(merged["artist"])

    confidence = build_confidence(reasons, merged)
    if any("knowledge" in r for r in reasons):
        if "glyph-knowledge" not in sources:
            sources.append("glyph-knowledge")

    hints = [{"field": "*", "message": r} for r in reasons[:12]]
    out_hints: dict | list = hints
    if spectral_unavailable:
        out_hints = {
            "messages": hints,
            "spectralAvailable": False,
            "degradation": "spectral-unavailable",
        }

    return {
        "fields": {
            "title": merged.get("title") or "",
            "artist": merged.get("artist") or "",
            "artists": merged.get("artists") or [],
            "album": merged.get("album") or "",
            "genre": merged.get("genre") or "",
            "year": merged.get("year") or "",
            "trackNo": merged.get("trackNo") or "",
        },
        "confidence": confidence,
        "sources": sources,
        "provider": "glyph-mi",
        "hints": out_hints,
    }


def analyze_batch(items: list[dict]) -> list[dict]:
    return [analyze_one(item) for item in items]
