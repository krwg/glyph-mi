# glyph-mi 2.3-O

**Metadata Intelligence** for [Senza](https://github.com/FlokeStudio/Senza) — local tag suggestions, spectral BPM/genre hints, knowledge packs, KNN, optional Ollama.

<p>
  <img src="https://img.shields.io/badge/version-2.3.0-blue" alt="version" />
  <img src="https://img.shields.io/badge/mode-offline--first-green" alt="offline" />
  <img src="https://img.shields.io/badge/Ollama-optional-111" alt="ollama" />
  <a href="https://github.com/FlokeStudio/glyph-mi/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-orange" alt="license" /></a>
</p>

Full guide (RU): **[GUIDE.ru.md](GUIDE.ru.md)**

## Layout

```
js/              Renderer pipeline (rules → spectral → ML → KNN → Ollama)
glyph_mi/        Python MI + spectral.py (optional librosa)
core/            Shared Ollama + tokenize
knowledge/public/ Shipped knowledge packs
models/          Optional ONNX weights (not in git by default)
```

## Senza integration

From `Senza Dev/`:

```bash
npm run glyph:sync-mirror   # this repo → Senza Dev/glyph-mi/
npm run glyph:push-mirror   # Senza js/models → this repo
```

On import, Senza’s `glyph-features.cjs` fills `track.glyph` (BPM, energy, genre). The JS pipeline reads `context.glyphFeatures` for tagging.

## Python (optional)

```bash
pip install -e ".[spectral]"   # adds librosa for BPM/spectrum CLI
glyph-mi analyze --help
```

## Optional: Ollama

1. Install [Ollama](https://ollama.com/) → `ollama pull llama3.2`
2. In Senza **Settings → Glyph**: enable local agent / Ollama
3. Default URL: `http://127.0.0.1:11434`

Used only when confidence is low; rules + spectral + KNN run first.

## Related Glyph repos

| Repo | Role |
|------|------|
| [glyph-miO](https://github.com/FlokeStudio/glyph-miO) | Obsidian note MI |
| [glyph-s](https://github.com/FlokeStudio/glyph-s) | Search engine |
| [glyph-sO](https://github.com/FlokeStudio/glyph-sO) | Obsidian vault search |

---

Floke Studio · GPL-3.0-or-later
