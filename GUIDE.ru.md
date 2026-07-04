# Glyph — единое руководство (Senza + Glyph-MI)

**Версия платформы:** **Glyph 2.3-O** (Senza MI + Search + Obsidian) · **Репозиторий:** [krwg/glyph-mi](https://github.com/krwg/glyph-mi)  
**Зеркало в Senza:** `Senza Dev/glyph-mi/` · **Поиск:** репо [glyph-s](../glyph-s) · **Obsidian:** [glyph-mio](../glyph-mio), [glyph-so](../glyph-so) · **Канон — этот файл.**

---

## 1. Суть

**Glyph** — локальный **Metadata Intelligence** внутри Senza: теги, путь `music/Artist/Album`, соседи альбома, пакеты знаний, **KNN** по библиотеке, опционально **MusicBrainz / AcoustID / Ollama**. Плюс дубликаты, **Поток**, diff/batch UI, SQLite-журнал событий.

Пользователю **не нужны** Python, pip, Glyph Lab, fpcalc (кроме спектральных дубликатов).

| В Senza 1.0 Vivo | Glyph2.1-O |
|------------------|------------|
| **Поток (Flow)** | волна ~32 трека, режимы отбора, палитра с обложки, плавный **pulse 0–10** и ритм по BPM |
| **Импорт** | `normalizeImportMeta` до копирования → опциональный **авто-тег** MP3 |
| **Редактор тегов** | панель: балл, бейджи источников, diff, чипы, Apply / Reject / Re-run |
| **Библиотека (Vault)** | скан, превью правок, дубликаты, batch «Заполнить библиотеку» |
| **Настройки** | **вкл/выкл Glyph2.1-O**, MB, SQLite-лог, аналитика, экспорт JSONL |
| **Журнал Senza** | отдельно от Glyph-log: время в приложении, прослушивание, топы (см. §7) |

**Выключение Glyph** (`settings.glyphEnabled = false`): обычный редактор тегов, бренд **SENZA** на Потоке, без скана Glyph в библиотеке.

---

## 2. Репозитории и зеркало

```
Floke Dev/
  Glyph-MI/          js, glyph_mi, core, knowledge, models
  glyph-s/           Search 2.3-O/On
  glyph-mio/         Obsidian MI-O plugin
  glyph-so/          Obsidian Search-O plugin
  Senza Dev/
    glyph-mi/        зеркало Glyph-MI
    electron/glyph-features.cjs  → track.glyph при импорте
  Floke/docs/assets/glyph-search-2.3.js
```

| Команда | Направление |
|---------|-------------|
| `npm run glyph:sync-mirror` | Glyph-MI → Senza `glyph-mi/` |
| `npm run glyph:push-mirror` | Senza `glyph-mi/js` → Glyph-MI |
| `cd glyph-s && npm run bundle:floke` | glyph-s → Floke landing |

**В релизе Senza** анализ — только **JS**. Python — Lab, CI, обучение ONNX.

---

## 3. Конвейер Glyph 2.3-O

```
вход (path, tags, соседи альбома, glyphFeatures с импорта)
  → rules + filename-parser (junk-strip, type beat)
  → glyph-spectral (BPM/energy/genreHint из track.glyph)
  → knowledge packs (public + learned-user)
  → sanitize (папка > VA, Artist - Title в title)
  → ml-heuristic (+ ONNX если models/*.onnx)
  → KNN (tracks_features в SQLite + память библиотеки)
  → MusicBrainz / AcoustID (если включено)
  → Ollama только если score < порога (~42)
  → suggestion-confidence (балл «применить»)
```

| provider / source | Роль |
|-------------------|------|
| `glyph-rules` | имя файла, теги, папка |
| `glyph-mi` | rules + knowledge + sanitize |
| `glyph-ml` | эвристики жанра/BPM; без слепого Pop |
| `glyph-knn` | консенсус похожих треков в библиотеке |
| `musicbrainz` / `acoustid` | онлайн + кэш `library/glyph/cache/` |
| `glyph-local` | Ollama `127.0.0.1:11434` |

**Ядро JS:** `pipeline.js`, `core/filename-parser.js`, `core/junk-strip.js`, `core/knn.js`, `core/ml-heuristic.js`, `core/logger.js`, `core/title-vector.js`, `providers/mi.js`, `core/sanitize.js`, `core/suggestion-confidence.js`.

**Senza renderer:** `glyph-ui.js`, `glyph-diff.js`, `glyph-batch.js`, `glyph-auto-tag.js`, `glyph-scan.js`, `glyph-duplicates.js`, `glyph-spectral.js`, `glyph-vault.js`, `glyph-telemetry.js`, `glyph-settings.js`, `flow.js`, `flow-ambient.js`.

**Senza main:** `glyph-import-meta.cjs`, `glyph-features.cjs`, `glyph-online.cjs`, `glyph-log-db.cjs`, `glyph-db.cjs`, `glyph-learn-rules.cjs`, `glyph-onnx.cjs`.

---

## 4. Импорт

1. `readTags` → **`normalizeImportMeta`** (разбор `Artist - Title` **до** копирования)  
2. `resolveLibraryAudioPath` → `music/Artist/Album/`  
3. `extractGlyphFeatures` → `track.glyph` (bpm, energy, mood)  
4. Если **Glyph включён** и **авто-тег при импорте** — `autoTagTracks` → `writeTags` (MP3), событие `glyph.auto`  
5. `glyphDbSync` — индекс признаков для KNN  

Без шага 2 файлы попадали в `Unknown Artist/`.

---

## 5. Дубликаты, batch и Поток

| Дубликаты | Логика |
|-----------|--------|
| Метаданные | artist \| title \| album \| duration |
| Имя файла | один basename |
| Спектр | fpcalc + chromaprint, sim ≥ 0.82 (`npm run glyph:download-tools`) |

**Batch:** `glyph-batch.js` — скан библиотеки, превью diff, массовое применение; кнопка в Vault.

**Поток:** `flow.js` — волна без повторов в сессии (режимы: balanced / favorites / rare / discover).  
`flow-ambient.js` — градиенты с обложки, CSS-переменные `--flow-pulse` (0–10) и `--flow-beat`, интерполяция по `audio.currentTime` и BPM. Librosa в UI-релизе нет.

---

## 6. Пакеты знаний

| Пакет | Где |
|-------|-----|
| `core-v1`, `heuristics-v1` | `knowledge/public/` (в git) |
| `user-learned-v1` | после импорта экспорта Senza |
| `learned-user.json` | `library/glyph/knowledge/` — правила с **decay 60 дней** |

VA в эвристиках — **только** папка `Various Artists`, не подстрока `va` в пути.

---

## 7. Два «журнала»

### A. Журнал прослушиваний Senza (`senza-state.json` → `playHistory`)

| Метрика | Как считается |
|---------|----------------|
| Время в Senza | `state.usage.totalMs` — активное окно |
| Время прослушивания | сумма `durationSec` по записям истории |
| Топ артистов / треков | за 7 дней |
| Time Capsule | запись ~год назад (±7 дней) |

UI: **Настройки → Журнал** (не в нижнем быстром меню).

### B. Журнал событий Glyph (SQLite)

Файл: `library/glyph/glyph-log.sqlite`

| Таблица | Содержимое |
|---------|------------|
| `glyph_log` | suggest / apply / reject / auto, confidence, sources |
| `glyph_diff` | val_before → val_glyph → val_after |
| `tracks_features` | векторы для KNN |

События: `glyph.suggest`, `glyph.apply`, `glyph.apply.edited`, `glyph.reject`, `glyph.auto`, `glyph.noop`, `glyph.ollama` (telemetry).

Код: `js/core/logger.js`, `electron/glyph-log-db.cjs`, `src/js/glyph-telemetry.js`.  
Экспорт **JSONL для fine-tune** → `library/glyph/exports/`.

### Legacy jsonl

`library/glyph/learn.jsonl` — опция «журнал обучения»; экспорт в private pack.

---

## 8. Онлайн

| Сервис | Нужно |
|--------|--------|
| MusicBrainz | интернет + переключатель в настройках |
| AcoustID | опционально API key |
| fpcalc | только спектральные дубликаты |
| Ollama | выкл. по умолчанию; «try local agent» |

---

## 9. Glyph Lab (приватно)

```bash
cd "Senza Dev"
npm run glyph-lab    # GUI :5175
```

Workflow: Senza → правки тегов → экспорт → Lab → пакет → `glyph:push-mirror`.  
`glyph-lab/PLAYBOOK.ru.md` — локально, не в git.

---

## 10. Команды

| Команда | Зачем |
|---------|--------|
| `npm run electron:dev:watch` | Senza + hot reload |
| `npm run electron:build` | Windows installer 1.0.0 |
| `npm run glyph:sync-mirror` | Glyph-MI → Senza |
| `npm run glyph:push-mirror` | Senza js → Glyph-MI |
| `npm run glyph:import-export` | экспорт → private pack |
| `npm run glyph:download-tools` | fpcalc |
| `npm run glyph-lab` | кураторство пакетов |

---

## 11. Ограничения

- Запись тегов в релизе — в основном **MP3** (ID3).  
- ONNX — только при модели в `glyph-mi/models/` + `onnxruntime-node`.  
- MusicBrainz / AcoustID — сеть и качество исходных тегов.  
- Жанр Pop не подставляется без сильных сигналов (ml-heuristic + KNN).

---

## 12. История версий

| Версия | Senza | Содержание |
|--------|-------|------------|
| **2.1-O** | **1.0.0 Vivo** | SQLite KNN index, decay 60d, Diff UI, batch, аналитика, toggle Glyph, журнал Senza расширен, pulse Flow |
| 2.0 | 0.x | pipeline, KNN JSON, telemetry, learned-user |
| 1.0-O | ранний MVP | rules + MI, без batch/SQLite |

**ONNX:** `python Glyph-MI/scripts/train-glyph-genre.py --db library/glyph/glyph-log.sqlite` → `.onnx` в `glyph-mi/models/`.

---

*krwg · правки документации — только здесь · Senza: `docs/GLYPH.md` (ссылка)*
