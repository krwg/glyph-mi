# glyph-mi 2.7

Universal Metadata Intelligence core for Glyph products.

[Site](https://krwg.github.io/glyph-mi/) · [GUIDE.ru.md](GUIDE.ru.md)

## User section

In 2.7, `glyph-mi` keeps Senza behavior and becomes modular:

- Senza support remains first-class through module + adapter.
- Universal core contracts are now available for other product integrations.
- Cultiva module foundation is added as scaffold (not integrated yet).

## GitHub / Dev section

### New architecture

```
js/universal/contracts.js      # normalized input/result contracts
js/universal/engine.js         # universal analyze entry and module routing
js/modules/senza/              # Senza module adapter
js/modules/cultiva/            # Cultiva foundation scaffold
knowledge/public/cultiva-foundation-v1.json
```

### Integration model

- Use `analyzeUniversal(input, { moduleId })` for module-aware analysis.
- Use `listGlyphModules()` / `resolveGlyphModule()` for registry introspection.
- Current modules:
  - `senza` (active)
  - `cultiva` (scaffold)

### Python package

```bash
pip install -e ".[spectral]"
glyph-mi analyze --help
```

### License

krwg · GPL-3.0-or-later
