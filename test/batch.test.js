import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBatch } from '../js/index.js';

describe('analyzeBatch', () => {
  it('returns an array with one result per item', async () => {
    const items = [
      { filePath: '/music/one.flac', tags: { title: 'Track One', artist: 'Artist A' }, context: {} },
      { filePath: '/music/two.flac', tags: { title: 'Track Two', artist: 'Artist B' }, context: {} },
    ];

    const results = await analyzeBatch(items, { provider: 'rules' });

    assert.ok(Array.isArray(results));
    assert.equal(results.length, 2);
    assert.ok(typeof results[0].confidence === 'number' || results[0].confidence?.score != null);
    assert.ok(typeof results[1].confidence === 'number' || results[1].confidence?.score != null);
  });
});
