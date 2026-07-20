import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runGlyphPipeline, analyzeTrackFull } from '../js/pipeline.js';
import { titleEmbedding } from '../js/core/title-vector.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function baseResult(overrides = {}) {
  return {
    fields: {
      title: 'Empty Genre Track',
      artist: 'Test Artist',
      album: 'Test Album',
      genre: '',
      year: '2024',
      trackNo: '1',
      ...(overrides.fields || {}),
    },
    confidence: { score: 40, reasons: ['rules'], ...(overrides.confidence || {}) },
    sources: ['glyph-rules'],
    provider: 'glyph-mi',
    hints: [],
    ...overrides,
  };
}

describe('runGlyphPipeline layers', () => {
  it('spectral layer fills genre from glyphFeatures when empty', async () => {
    const track = {
      id: 't1',
      path: '/library/Artist/Album/track.flac',
      title: 'Empty Genre Track',
      artist: 'Test Artist',
      glyph: { bpm: 128, energy: 0.22, genreHint: 'Electronic' },
    };
    const result = await runGlyphPipeline(track, { settings: {} }, baseResult(), {
      libraryRows: [],
      settings: {},
    });
    assert.equal(result.fields.genre, 'Electronic');
    assert.ok(result.sources.includes('glyph-spectral'));
    assert.ok(result.confidence?.reasons?.some((r) => /spectral/i.test(r)));
  });

  it('ml heuristic layer suggests genre when spectral absent', async () => {
    const track = {
      id: 't2',
      path: '/library/DJ/Techno/midnight techno groove.flac',
      title: 'Midnight Techno Groove',
      artist: 'DJ Test',
      glyph: { bpm: 132, energy: 0.25 },
    };
    const result = await runGlyphPipeline(
      track,
      { settings: {} },
      baseResult({
        fields: {
          title: 'Midnight Techno Groove',
          artist: 'DJ Test',
          album: '',
          genre: '',
        },
      }),
      { libraryRows: [], settings: {} }
    );
    assert.ok(result.fields.genre, 'expected ML/heuristic genre');
    assert.ok(
      result.sources.includes('glyph-ml') ||
        result.confidence?.reasons?.some((r) => /heuristic|ml/i.test(r))
    );
  });

  it('knn layer fills album from library consensus', async () => {
    const title = 'Shared Title';
    const artist = 'Consensus Artist';
    const vec = titleEmbedding(title, artist);
    const libraryRows = [];
    for (let i = 0; i < 4; i++) {
      libraryRows.push({
        track_id: `lib-${i}`,
        title,
        artist_norm: artist.toLowerCase(),
        album: 'Consensus Album',
        genre: 'Rock',
        bpm: 120,
        energy: 0.15,
        title_vec: vec,
      });
    }

    const track = {
      id: 'query-1',
      path: '/library/x/y/z.flac',
      title,
      artist,
      glyph: { bpm: 120, energy: 0.15 },
    };
    const result = await runGlyphPipeline(
      track,
      { settings: { glyphUseKnn: true } },
      baseResult({
        fields: {
          title,
          artist,
          album: '',
          genre: '',
        },
      }),
      { libraryRows, settings: { glyphUseKnn: true } }
    );
    assert.equal(result.fields.album, 'Consensus Album');
    assert.ok(result.sources.includes('glyph-knn'));
  });

  it('skips knn when glyphUseKnn is false', async () => {
    const title = 'Shared Title';
    const artist = 'Consensus Artist';
    const vec = titleEmbedding(title, artist);
    const libraryRows = Array.from({ length: 4 }, (_, i) => ({
      track_id: `lib-${i}`,
      title,
      artist_norm: artist.toLowerCase(),
      album: 'Should Not Apply',
      genre: 'Rock',
      bpm: 120,
      energy: 0.15,
      title_vec: vec,
    }));

    const result = await runGlyphPipeline(
      {
        id: 'q',
        path: '/a/b/c.flac',
        title,
        artist,
        glyph: { bpm: 120, energy: 0.15 },
      },
      { settings: { glyphUseKnn: false } },
      baseResult({ fields: { title, artist, album: '', genre: '' } }),
      { libraryRows, settings: { glyphUseKnn: false } }
    );
    assert.notEqual(result.fields.album, 'Should Not Apply');
    assert.ok(!result.sources.includes('glyph-knn'));
  });
});

describe('analyzeTrackFull', () => {
  it('returns fields and confidence for a basic track', async () => {
    const track = {
      id: 'full-1',
      path: '/music/Artist Name/Album Name/01 - Song Title.flac',
      title: '',
      artist: '',
      glyph: { bpm: 100, energy: 0.1 },
    };
    const result = await analyzeTrackFull(
      track,
      { settings: { glyphTryLocal: false } },
      {
        input: {
          filePath: track.path,
          tags: {},
          context: {},
        },
        libraryRows: [],
      }
    );
    assert.ok(result.fields);
    assert.ok(result.confidence);
    assert.ok(Array.isArray(result.sources));
    assert.ok(result.provider);
  });
});

describe('npm pack pipeline smoke', () => {
  let workDir;

  after(() => {
    if (workDir && existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true });
    }
  });

  it('packed tarball includes pipeline and is importable', async () => {
    workDir = mkdtempSync(join(tmpdir(), 'glyph-mi-pipeline-pack-'));
    const packOut = execFileSync('npm', ['pack', '--pack-destination', workDir], {
      cwd: root,
      encoding: 'utf8',
      shell: true,
    })
      .trim()
      .split(/\r?\n/)
      .pop();
    const tarball = join(workDir, packOut);
    assert.ok(existsSync(tarball));

    const dry = execFileSync('npm', ['pack', '--dry-run', '--json'], {
      cwd: root,
      encoding: 'utf8',
      shell: true,
    });
    const files = JSON.parse(dry)[0]?.files?.map((f) => f.path) || [];
    assert.ok(files.includes('js/pipeline.js'), 'pipeline.js must be packed');
    assert.ok(files.includes('js/index.js'), 'package entry must be packed');

    const installDir = join(workDir, 'consumer');
    mkdirSync(installDir, { recursive: true });
    writeFileSync(
      join(installDir, 'package.json'),
      JSON.stringify({ name: 'glyph-mi-pipeline-consumer', private: true, type: 'module' })
    );
    execFileSync('npm', ['install', tarball, '--prefix', installDir], {
      encoding: 'utf8',
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const pkgRoot = join(installDir, 'node_modules', '@floke', 'glyph-mi');
    const pipelineUrl = pathToFileURL(join(pkgRoot, 'js', 'pipeline.js')).href;
    const mod = await import(pipelineUrl);
    assert.equal(typeof mod.runGlyphPipeline, 'function');
    assert.equal(typeof mod.analyzeTrackFull, 'function');

    const entry = await import(pathToFileURL(join(pkgRoot, 'js', 'index.js')).href);
    assert.equal(typeof entry.analyze, 'function');
  });
});
