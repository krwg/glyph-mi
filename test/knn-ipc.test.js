import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createKnnIpcHandler } from '../js/core/knn-ipc.js';
import { titleEmbedding } from '../js/core/title-vector.js';

describe('createKnnIpcHandler', () => {
  it('query returns nearest neighbors after loadFeatures', () => {
    const handler = createKnnIpcHandler(':memory:');
    const rows = [
      {
        track_id: 'a',
        title_vec: titleEmbedding('Summer Drive', 'Neon Pulse'),
        artist_norm: 'neon pulse',
        album: 'Highway',
        genre: 'Electronic',
        bpm: 128,
        energy: 0.2,
      },
      {
        track_id: 'b',
        title_vec: titleEmbedding('Winter Lullaby', 'Quiet Room'),
        artist_norm: 'quiet room',
        album: 'Still',
        genre: 'Ambient',
        bpm: 72,
        energy: 0.05,
      },
      {
        track_id: 'c',
        title_vec: titleEmbedding('Summer Night', 'Neon Pulse'),
        artist_norm: 'neon pulse',
        album: 'Highway',
        genre: 'Electronic',
        bpm: 124,
        energy: 0.18,
      },
    ];

    handler.loadFeatures(rows);
    const queryVec = titleEmbedding('Summer Cruise', 'Neon Pulse');
    const neighbors = handler.query(queryVec, 2);

    assert.equal(neighbors.length, 2);
    assert.ok(neighbors[0].similarity >= neighbors[1].similarity);
    assert.equal(neighbors[0].track_id, 'a');
    assert.equal(neighbors[1].track_id, 'c');
  });
});
