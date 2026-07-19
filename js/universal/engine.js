import { analyzeMI } from '../providers/mi.js';
import { normalizeInput, normalizeResult } from './contracts.js';
import { analyzeForSenza, SENZA_MODULE_MANIFEST } from '../modules/senza/index.js';
import { analyzeForCultivaFoundation, CULTIVA_MODULE_MANIFEST } from '../modules/cultiva/index.js';
import { analyzeForNotes, NOTES_MODULE_MANIFEST } from '../modules/notes/index.js';

const MODULE_HANDLERS = {
  senza: analyzeForSenza,
  cultiva: analyzeForCultivaFoundation,
  notes: analyzeForNotes,
  text: analyzeForNotes,
};

const MODULE_MANIFESTS = {
  senza: SENZA_MODULE_MANIFEST,
  cultiva: CULTIVA_MODULE_MANIFEST,
  notes: NOTES_MODULE_MANIFEST,
};

export function listGlyphModules() {
  return Object.values(MODULE_MANIFESTS);
}

export function resolveGlyphModule(moduleId = 'senza') {
  const id = moduleId === 'text' ? 'notes' : moduleId;
  return MODULE_MANIFESTS[id] || MODULE_MANIFESTS.senza;
}

export async function analyzeUniversal(input, runtime = {}) {
  const normalized = normalizeInput(input);
  const requestedId = runtime.moduleId || normalized.moduleId || 'senza';
  const moduleId = requestedId === 'text' ? 'notes' : requestedId;
  const handler = MODULE_HANDLERS[moduleId] || MODULE_HANDLERS[requestedId];
  if (handler) return handler(normalized, runtime.state || {}, runtime.options || {});

  const fallback = await analyzeMI(
    {
      filePath: normalized.track.path,
      tags: runtime.tags || {},
      context: normalized.context,
    },
    runtime.options || {}
  );

  return normalizeResult({
    ...fallback,
    moduleId: 'senza',
    hints: {
      ...(Array.isArray(fallback.hints)
        ? { messages: fallback.hints }
        : fallback.hints || {}),
      fallback: true,
      fallbackReason: `unknown moduleId "${requestedId}", routed to default senza analyzer`,
    },
  });
}
