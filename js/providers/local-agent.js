import {
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_URL,
  ollamaAvailable,
  ollamaJson,
} from '../../core/ollama.js';

function buildPrompt(input) {
  const tags = input.tags || {};
  const path = input.filePath || '';
  const spectral = input.context?.glyphFeatures;
  const spectralLine = spectral
    ? `\nSpectral hints: bpm=${spectral.bpm}, energy=${spectral.energy}, genreHint=${spectral.genreHint || ''}`
    : '';
  return `You are Glyph MI 2.3-O, an offline music metadata assistant. Reply with ONLY valid JSON, no markdown.
Suggest ID3 tags for this audio file.

Filename: ${path}
Current tags: title="${tags.title || ''}", artist="${tags.artist || ''}", album="${tags.album || ''}", genre="${tags.genre || ''}", year="${tags.year || ''}"${spectralLine}

JSON schema:
{"title":"","artist":"","album":"","genre":"","year":"","trackNo":"","confidence":"high|medium|low","reasons":["..."]}`;
}

export async function analyzeLocal(input, options = {}) {
  const parsed = await ollamaJson(
    { prompt: buildPrompt(input) },
    {
      ollamaUrl: options.ollamaUrl || DEFAULT_OLLAMA_URL,
      model: options.model || DEFAULT_OLLAMA_MODEL,
      timeoutMs: options.timeoutMs ?? 12000,
    }
  );
  if (!parsed?.title && !parsed?.artist) return null;

  return {
    fields: {
      title: parsed.title || '',
      artist: parsed.artist || '',
      artists: String(parsed.artist || '')
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      album: parsed.album || '',
      genre: parsed.genre || '',
      year: parsed.year ? String(parsed.year) : '',
      trackNo: parsed.trackNo ? String(parsed.trackNo) : '',
    },
    confidence: {
      level: parsed.confidence || 'medium',
      score: parsed.confidence === 'high' ? 80 : parsed.confidence === 'low' ? 40 : 60,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : ['local model'],
    },
    sources: ['glyph-local'],
    provider: 'glyph-local',
    hints: [{ field: '*', message: `model: ${options.model || DEFAULT_OLLAMA_MODEL}` }],
  };
}

export async function isLocalAgentAvailable(options = {}) {
  return ollamaAvailable({
    ollamaUrl: options.ollamaUrl || DEFAULT_OLLAMA_URL,
  });
}
