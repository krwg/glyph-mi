import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GLYPH_MI_API_VERSION,
  normalizeInput,
  normalizeResult,
} from '../js/universal/contracts.js';
import { analyzeUniversal, listGlyphModules, resolveGlyphModule } from '../js/universal/engine.js';
import { analyzeNotesPipeline } from '../js/modules/notes/pipeline.js';

describe('normalizeInput', () => {
  it('handles empty track without throwing', () => {
    const out = normalizeInput({});
    assert.equal(out.apiVersion, GLYPH_MI_API_VERSION);
    assert.equal(out.moduleId, 'senza');
    assert.equal(out.track.path, '');
    assert.equal(out.track.title, '');
    assert.equal(out.track.body, '');
    assert.deepEqual(out.track.headings, []);
    assert.deepEqual(out.context.siblingTracks, []);
  });

  it('merges note fields into track for notes consumers', () => {
    const out = normalizeInput({
      moduleId: 'notes',
      note: {
        title: 'My Note',
        body: '# Intro\nHello world about gardening tips.',
        headings: ['Intro'],
      },
    });
    assert.equal(out.moduleId, 'notes');
    assert.equal(out.track.title, 'My Note');
    assert.equal(out.track.body.includes('gardening'), true);
    assert.deepEqual(out.track.headings, ['Intro']);
  });

  it('aliases moduleId text → notes', () => {
    const out = normalizeInput({ moduleId: 'text', track: { title: 'x' } });
    assert.equal(out.moduleId, 'notes');
  });
});

describe('normalizeResult', () => {
  it('fills defaults for empty base', () => {
    const out = normalizeResult({});
    assert.equal(out.apiVersion, GLYPH_MI_API_VERSION);
    assert.equal(out.moduleId, 'senza');
    assert.equal(out.provider, 'glyph-mi');
    assert.deepEqual(out.fields, {});
    assert.equal(out.confidence.score, 0);
    assert.deepEqual(out.sources, []);
    assert.deepEqual(out.hints, {});
  });
});

describe('analyzeUniversal fallback', () => {
  it('unknown moduleId routes to senza with hints.fallbackReason', async () => {
    const result = await analyzeUniversal(
      { track: { path: '', title: '' }, context: { app: 'test' } },
      { moduleId: 'does-not-exist' }
    );
    assert.equal(result.moduleId, 'senza');
    assert.equal(result.hints.fallback, true);
    assert.match(result.hints.fallbackReason, /does-not-exist/);
    assert.match(result.hints.fallbackReason, /senza/);
  });
});

describe('notes module', () => {
  it('is registered in MODULE_MANIFESTS', () => {
    const ids = listGlyphModules().map((m) => m.moduleId);
    assert.ok(ids.includes('notes'));
    assert.ok(ids.includes('senza'));
    assert.ok(ids.includes('cultiva'));
    assert.equal(resolveGlyphModule('text').moduleId, 'notes');
  });

  it('analyzeUniversal notes returns tags and summary stubs', async () => {
    const body = [
      '# Gardens',
      '',
      'Tomato plants need sunlight every morning for healthy growth.',
      'Water the soil carefully after transplanting seedlings outdoors.',
      'Harvest tomatoes when they turn red and feel soft to touch.',
    ].join('\n');

    const result = await analyzeUniversal(
      {
        moduleId: 'notes',
        note: { title: 'Garden Log', body },
      },
      { moduleId: 'notes' }
    );

    assert.equal(result.moduleId, 'notes');
    assert.equal(result.provider, 'glyph-mi-notes');
    assert.equal(result.fields.title, 'Garden Log');
    assert.ok(result.fields.headings.includes('Gardens'));
    assert.ok(Array.isArray(result.fields.tags));
    assert.ok(result.fields.tags.length > 0);
    assert.ok(typeof result.fields.summary === 'string');
    assert.ok(result.sources.includes('glyph-notes'));
  });

  it('pipeline handles empty note', () => {
    const out = analyzeNotesPipeline({});
    assert.equal(out.fields.title, '');
    assert.deepEqual(out.fields.tags, []);
    assert.equal(out.fields.summary, '');
    assert.ok(out.confidence.reasons.some((r) => /empty/i.test(r)));
  });
});
