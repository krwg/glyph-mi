import { normalizeInput, normalizeResult } from '../../universal/contracts.js';
import { analyzeNotesPipeline } from './pipeline.js';

export const NOTES_MODULE_MANIFEST = {
  moduleId: 'notes',
  label: 'Notes Module',
  enabledByDefault: true,
  status: 'active',
  capabilities: ['tags', 'headings', 'summary', 'metadata'],
  product: 'glyph-miO',
  aliases: ['text'],
};

export function getNotesModuleManifest() {
  return NOTES_MODULE_MANIFEST;
}

export async function analyzeForNotes(input, _state = {}, options = {}) {
  const normalized = normalizeInput({ ...input, moduleId: 'notes' });
  const note = input.note || options.note || {};
  const contextTags = normalized.context.tags || {};

  const title =
    note.title ||
    normalized.track.title ||
    contextTags.title ||
    '';
  const body =
    note.body ||
    normalized.track.body ||
    contextTags.body ||
    '';
  const headings = Array.isArray(note.headings)
    ? note.headings
    : Array.isArray(normalized.track.headings)
      ? normalized.track.headings
      : Array.isArray(contextTags.headings)
        ? contextTags.headings
        : [];
  const frontTags = Array.isArray(note.frontTags)
    ? note.frontTags
    : Array.isArray(contextTags.frontTags)
      ? contextTags.frontTags
      : Array.isArray(contextTags.tags)
        ? contextTags.tags
        : [];

  const result = analyzeNotesPipeline({
    title,
    headings,
    body,
    path: normalized.track.path,
    frontTags,
  });

  return normalizeResult({
    ...result,
    moduleId: 'notes',
    provider: 'glyph-mi-notes',
    hints: {
      integrated: true,
      product: 'glyph-miO',
      nextStep: 'glyph-miO should call analyzeUniversal({ moduleId: "notes", note|track }) instead of local services.',
    },
  });
}

export const analyzeForText = analyzeForNotes;
