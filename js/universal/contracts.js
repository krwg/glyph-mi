export const GLYPH_MI_API_VERSION = '2.7.0';

export function normalizeInput(input = {}) {
  const track = input.track || {};
  const context = input.context || {};
  return {
    apiVersion: GLYPH_MI_API_VERSION,
    moduleId: input.moduleId || 'senza',
    track: {
      id: track.id || '',
      path: track.path || '',
      title: track.title || '',
      artist: track.artist || '',
      album: track.album || '',
      genre: track.genre || '',
      year: track.year || '',
      trackNo: track.trackNo || '',
      glyphFeatures: track.glyphFeatures || track.glyph || null,
    },
    context: {
      folderHint: context.folderHint || '',
      siblingTracks: Array.isArray(context.siblingTracks) ? context.siblingTracks : [],
      tags: context.tags || {},
      app: context.app || 'unknown',
    },
  };
}

export function normalizeResult(base = {}) {
  return {
    apiVersion: GLYPH_MI_API_VERSION,
    moduleId: base.moduleId || 'senza',
    provider: base.provider || 'glyph-mi',
    fields: base.fields || {},
    confidence: base.confidence || { score: 0, reasons: [] },
    sources: base.sources || [],
    hints: base.hints || {},
  };
}
