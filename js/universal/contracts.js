export const GLYPH_MI_API_VERSION = '2.8.0';

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

export function normalizeInput(input = {}) {
  const track = input.track || {};
  const note = input.note || {};
  const context = input.context || {};
  const moduleId = input.moduleId === 'text' ? 'notes' : input.moduleId || 'senza';

  return {
    apiVersion: GLYPH_MI_API_VERSION,
    moduleId,
    track: {
      id: track.id || note.id || '',
      path: track.path || note.path || '',
      title: track.title || note.title || '',
      artist: track.artist || '',
      album: track.album || '',
      genre: track.genre || '',
      year: track.year || '',
      trackNo: track.trackNo || '',
      body: track.body || note.body || '',
      headings: asStringArray(track.headings?.length ? track.headings : note.headings),
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
    moduleId: base.moduleId === 'text' ? 'notes' : base.moduleId || 'senza',
    provider: base.provider || 'glyph-mi',
    fields: base.fields || {},
    confidence: base.confidence || { score: 0, reasons: [] },
    sources: base.sources || [],
    hints: base.hints || {},
  };
}
