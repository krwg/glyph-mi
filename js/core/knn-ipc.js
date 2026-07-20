import { vectorSimilarity } from './title-vector.js';

export function createKnnIpcHandler(dbPath) {
  const store = new Map();
  const resolvedPath = String(dbPath || '');

  function loadFeatures(rows) {
    store.clear();
    for (const row of rows || []) {
      const trackId = row.track_id ?? row.id;
      if (trackId == null) continue;
      const vector = row.title_vec ?? row.vector;
      if (!vector || !vector.length) continue;
      const normalized =
        vector instanceof Float32Array ? vector : Float32Array.from(vector);
      store.set(String(trackId), {
        track_id: trackId,
        vector: normalized,
        artist_norm: row.artist_norm ?? '',
        album: row.album ?? '',
        genre: row.genre ?? '',
        bpm: row.bpm ?? 0,
        energy: row.energy ?? 0,
      });
    }
  }

  function query(vector, k = 8) {
    const queryVec =
      vector instanceof Float32Array ? vector : Float32Array.from(vector || []);
    const scored = [];
    for (const entry of store.values()) {
      const similarity = vectorSimilarity(queryVec, entry.vector);
      scored.push({
        track_id: entry.track_id,
        similarity,
        artist_norm: entry.artist_norm,
        album: entry.album,
        genre: entry.genre,
        bpm: entry.bpm,
        energy: entry.energy,
      });
    }
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, Math.max(1, k));
  }

  return { query, loadFeatures, dbPath: resolvedPath };
}
