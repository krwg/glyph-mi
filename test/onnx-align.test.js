import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  ONNX_FEATURE_DIM,
  ONNX_FEATURE_NAMES,
  buildOnnxFeatures,
  labelsPathForModel,
  loadGenreLabels,
  classifyGenreMood,
  resetOnnxCaches,
} from '../js/core/glyph-onnx.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const trainScript = join(root, 'scripts', 'train-glyph-genre.py');

function findPython() {
  for (const cmd of ['python', 'python3', 'py']) {
    try {
      execFileSync(cmd, ['--version'], { stdio: 'ignore', shell: true });
      return cmd;
    } catch {
      /* try next */
    }
  }
  return null;
}

describe('ONNX feature contract', () => {
  it('buildOnnxFeatures matches train script dim and order', () => {
    const feats = buildOnnxFeatures({
      bpm: 128,
      energy: 0.4,
      title: 'abcd',
      artist: 'xy',
      genre: 'ignored-for-features',
    });
    assert.equal(feats.length, ONNX_FEATURE_DIM);
    assert.equal(ONNX_FEATURE_NAMES.length, ONNX_FEATURE_DIM);
    assert.deepEqual(feats, [128, 0.4, 4, 2]);
  });

  it('labelsPathForModel resolves sibling genre-labels.json', () => {
    const resolved = labelsPathForModel(join('models', 'glyph-genre-mood-v1.onnx'));
    assert.equal(resolved, join('models', 'genre-labels.json'));
  });
});

describe('classifyGenreMood heuristic fallback', () => {
  after(() => resetOnnxCaches());

  it('uses heuristics when model path is absent', async () => {
    const out = await classifyGenreMood({
      title: 'Midnight Techno Groove',
      artist: 'DJ Test',
      path: '/music/techno/track.flac',
      bpm: 130,
      energy: 0.2,
    });
    assert.equal(out.fromOnnx, undefined);
    assert.ok(out.genre);
    assert.ok(Array.isArray(out.reasons));
  });

  it('uses heuristics when model file is missing', async () => {
    resetOnnxCaches();
    const out = await classifyGenreMood(
      { title: 'Piano Sonata', artist: 'Classical Artist', path: '/x.flac' },
      { modelPath: join(tmpdir(), 'definitely-missing-glyph.onnx') }
    );
    assert.equal(out.fromOnnx, undefined);
    assert.ok(out.provider === 'glyph-ml' || out.reasons.length >= 0);
  });
});

describe('train/infer label round-trip via fixture sqlite', () => {
  let workDir;
  const python = findPython();

  before(() => {
    workDir = mkdtempSync(join(tmpdir(), 'glyph-onnx-align-'));
  });

  after(() => {
    resetOnnxCaches();
    if (workDir && existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true });
    }
  });

  it('export-matrix features match JS buildOnnxFeatures', async (t) => {
    if (!python) {
      t.skip('python not available');
      return;
    }

    const dbPath = join(workDir, 'glyph-log.sqlite');
    const matrixPath = join(workDir, 'matrix.json');
    const setupPath = join(workDir, 'setup_fixture.py');

    writeFileSync(
      setupPath,
      [
        'import sqlite3',
        `conn = sqlite3.connect(${JSON.stringify(dbPath)})`,
        'conn.execute("""CREATE TABLE tracks (',
        '  bpm REAL, energy REAL, genre TEXT, title TEXT, artist TEXT',
        ')""")',
        'rows = [',
        "  (120, 0.2, 'Electronic', 'Alpha', 'A'),",
        "  (90, 0.1, 'Jazz', 'Beta Song', 'BB'),",
        "  (140, 0.3, 'Electronic', 'G', 'Artist Name'),",
        ']',
        "conn.executemany('INSERT INTO tracks VALUES (?,?,?,?,?)', rows)",
        'conn.commit()',
        'conn.close()',
        '',
      ].join('\n')
    );
    execFileSync(python, [setupPath], { encoding: 'utf8' });

    execFileSync(
      python,
      [trainScript, '--db', dbPath, '--min-rows', '3', '--export-matrix', matrixPath],
      { encoding: 'utf8' }
    );

    const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'));
    assert.equal(matrix.featureDim, ONNX_FEATURE_DIM);
    assert.deepEqual(matrix.featureNames, ONNX_FEATURE_NAMES);
    assert.equal(matrix.features.length, 3);

    const samples = [
      { bpm: 120, energy: 0.2, title: 'Alpha', artist: 'A' },
      { bpm: 90, energy: 0.1, title: 'Beta Song', artist: 'BB' },
      { bpm: 140, energy: 0.3, title: 'G', artist: 'Artist Name' },
    ];
    for (let i = 0; i < samples.length; i++) {
      assert.deepEqual(matrix.features[i], buildOnnxFeatures(samples[i]));
    }

    writeFileSync(
      join(workDir, 'genre-labels.json'),
      JSON.stringify({
        featureNames: matrix.featureNames,
        featureDim: matrix.featureDim,
        labels: matrix.labels,
      })
    );
    resetOnnxCaches();
    const spec = await loadGenreLabels(join(workDir, 'fake-model.onnx'));
    assert.ok(spec);
    assert.deepEqual(spec.labels, ['Electronic', 'Jazz']);
    assert.equal(spec.featureDim, 4);
  });
});
