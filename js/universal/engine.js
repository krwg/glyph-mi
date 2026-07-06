import { analyzeMI } from '../providers/mi.js';
import { normalizeInput, normalizeResult } from './contracts.js';
import { analyzeForSenza, SENZA_MODULE_MANIFEST } from '../modules/senza/index.js';
import { analyzeForCultivaFoundation, CULTIVA_MODULE_MANIFEST } from '../modules/cultiva/index.js';

const MODULE_HANDLERS = {
  senza: analyzeForSenza,
  cultiva: analyzeForCultivaFoundation,
};

const MODULE_MANIFESTS = {
  senza: SENZA_MODULE_MANIFEST,
  cultiva: CULTIVA_MODULE_MANIFEST,
};

export function listGlyphModules() {
  return Object.values(MODULE_MANIFESTS);
}

export function resolveGlyphModule(moduleId = 'senza') {
  return MODULE_MANIFESTS[moduleId] || MODULE_MANIFESTS.senza;
}

export async function analyzeUniversal(input, runtime = {}) {
  const normalized = normalizeInput(input);
  const moduleId = runtime.moduleId || normalized.moduleId || 'senza';
  const handler = MODULE_HANDLERS[moduleId];
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
      ...(fallback.hints || {}),
      fallback: 'unknown module, routed to default analyzer',
    },
  });
}
