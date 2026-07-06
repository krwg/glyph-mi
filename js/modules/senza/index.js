import { analyzeTrackFull } from '../../pipeline.js';
import { normalizeInput, normalizeResult } from '../../universal/contracts.js';

export const SENZA_MODULE_MANIFEST = {
  moduleId: 'senza',
  label: 'Senza Module',
  enabledByDefault: true,
  capabilities: ['tags', 'metadata', 'spectral', 'knn', 'local-agent'],
  product: 'senza',
};

export async function analyzeForSenza(input, state = {}, options = {}) {
  const normalized = normalizeInput({ ...input, moduleId: 'senza' });
  const track = {
    ...normalized.track,
    glyph: normalized.track.glyphFeatures || {},
  };
  const result = await analyzeTrackFull(track, state, {
    ...options,
    input: {
      filePath: normalized.track.path,
      tags: options.tags || {},
      context: {
        ...normalized.context,
        glyphFeatures: normalized.track.glyphFeatures || null,
      },
    },
  });
  return normalizeResult({ ...result, moduleId: 'senza' });
}
