/** Split search query into lowercase tokens (unicode-aware letters/numbers). */
export function tokenizeQuery(q) {
  return String(q || '')
    .trim()
    .toLowerCase()
    .split(/[\s#./_\-]+/)
    .filter(Boolean);
}

/**
 * Parse `type:release page:glyph app:senza` filters + free tokens.
 */
export function parseSearchQuery(raw) {
  const parts = String(raw || '').trim().split(/\s+/);
  const filters = { type: null, page: null, app: null, tokens: [] };
  for (const p of parts) {
    const m = p.match(/^(type|page|app):(.+)$/i);
    if (m) filters[m[1].toLowerCase()] = m[2].toLowerCase();
    else filters.tokens.push(p.toLowerCase());
  }
  return filters;
}
