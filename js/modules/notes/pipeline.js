/**
 * Textual notes analysis — tag scoring + extractive summary stubs.
 * Heuristics aligned with glyph-miO services for future convergence.
 */

const STOP_WORDS = new Set([
  'the', 'that', 'this', 'with', 'from', 'have', 'will', 'your', 'note', 'tags', 'and', 'for',
  'для', 'как', 'это', 'при', 'что', 'или', 'эта', 'этот', 'того', 'быть', 'были', 'может',
  'также', 'через', 'после', 'если', 'когда', 'только', 'уже', 'все', 'всё', 'его', 'ее', 'её',
]);

function scoreFromSignals(word, freq, headingWords, linkCount) {
  let score = freq * 2;
  if (headingWords.has(word)) score += 10;
  if (linkCount > 6) score += 1;
  return score;
}

export function extractHeadingsFromBody(body) {
  const lines = String(body || '').split(/\r?\n/);
  const headings = [];
  for (const line of lines) {
    const m = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (m) headings.push(m[1].trim());
  }
  return headings.slice(0, 10);
}

export function countWikiLinks(body) {
  const matches = String(body || '').match(/\[\[[^\]]+\]\]/g);
  return matches ? matches.length : 0;
}

export function stripForSummary(body) {
  return String(body || '')
    .replace(/^---[\s\S]*?---\n?/m, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s+/gm, '')
    .replace(/[*_~>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text) {
  const out = String(text || '')
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 18);
  return out.length ? out : [String(text || '').trim()].filter(Boolean);
}

export function extractiveSummary(body, headings = []) {
  const plain = stripForSummary(body);
  if (!plain) return '';
  const sentences = splitSentences(plain);
  if (sentences.length <= 2) return sentences.join(' ');

  const words = plain.toLowerCase().match(/[a-zа-яё0-9]{4,}/gi) || [];
  const freq = new Map();
  for (const word of words) freq.set(word, (freq.get(word) || 0) + 1);
  for (const heading of headings) {
    for (const word of String(heading).toLowerCase().split(/\s+/)) {
      if (word.length > 3) freq.set(word, (freq.get(word) || 0) + 8);
    }
  }
  const scored = sentences.map((sentence, i) => {
    const sw = sentence.toLowerCase().match(/[a-zа-яё0-9]{4,}/gi) || [];
    let score = i < 2 ? 3 : 0;
    for (const word of sw) score += freq.get(word) || 0;
    return { sentence, score, i };
  });
  scored.sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, 4).sort((a, b) => a.i - b.i);
  return picked.map((x) => x.sentence).join(' ');
}

/**
 * Score tag candidates from title, headings, and body.
 * @returns {{ tags: string[], tagScores: Array<{tag:string,score:number}>, wordCount: number, linkCount: number }}
 */
export function scoreTags({ title = '', headings = [], body = '', frontTags = [] } = {}) {
  const words = String(body || '').toLowerCase().match(/[a-z0-9а-яё]{4,}/g) || [];
  const freq = new Map();
  for (const w of words) {
    if (STOP_WORDS.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  const headingList = Array.isArray(headings) ? headings : [];
  const headingWords = new Set(
    headingList
      .join(' ')
      .toLowerCase()
      .match(/[a-z0-9а-яё]{4,}/g) || []
  );
  const titleWords = String(title || '')
    .toLowerCase()
    .match(/[a-z0-9а-яё]{4,}/g) || [];
  for (const w of titleWords) {
    if (!STOP_WORDS.has(w)) headingWords.add(w);
  }

  const linkCount = countWikiLinks(body);
  const scored = [...freq.entries()]
    .map(([word, raw]) => ({
      tag: word,
      score: scoreFromSignals(word, raw, headingWords, linkCount),
    }))
    .sort((a, b) => b.score - a.score);

  const front = (Array.isArray(frontTags) ? frontTags : [])
    .map(String)
    .map((t) => t.replace(/^#/, '').trim())
    .filter(Boolean);

  const tags = [...new Set([...front, ...scored.map((s) => s.tag)])].slice(0, 12);
  return {
    tags,
    tagScores: scored.slice(0, 12),
    wordCount: words.length,
    linkCount,
  };
}

/**
 * Run the notes analysis pipeline from normalized input fields.
 */
export function analyzeNotesPipeline({ title, headings, body, path, frontTags } = {}) {
  const resolvedHeadings =
    Array.isArray(headings) && headings.length
      ? headings.slice(0, 10)
      : extractHeadingsFromBody(body);

  const resolvedTitle =
    String(title || '').trim() ||
    String(path || '')
      .split(/[/\\]/)
      .pop()
      ?.replace(/\.md$/i, '') ||
    '';

  const { tags, tagScores, wordCount, linkCount } = scoreTags({
    title: resolvedTitle,
    headings: resolvedHeadings,
    body: body || '',
    frontTags,
  });

  const summary = extractiveSummary(body || '', resolvedHeadings);
  const reasons = [];
  if (resolvedTitle) reasons.push('notes: title resolved');
  if (resolvedHeadings.length) reasons.push(`notes: ${resolvedHeadings.length} heading(s)`);
  if (tags.length) reasons.push(`notes: ${tags.length} tag candidate(s)`);
  if (summary) reasons.push('notes: extractive summary');
  if (!body && !resolvedTitle) reasons.push('notes: empty note');

  let score = 15;
  if (resolvedTitle) score += 20;
  if (resolvedHeadings.length) score += Math.min(20, resolvedHeadings.length * 4);
  if (tags.length) score += Math.min(25, tags.length * 3);
  if (summary) score += 15;
  if (wordCount > 40) score += 5;
  score = Math.max(0, Math.min(100, score));

  let level = 'low';
  if (score >= 72) level = 'high';
  else if (score >= 48) level = 'medium';

  return {
    fields: {
      title: resolvedTitle,
      headings: resolvedHeadings,
      body: String(body || ''),
      tags,
      tagScores,
      summary,
      wordCount,
      linkCount,
    },
    confidence: { score, level, reasons },
    sources: ['glyph-notes'],
  };
}
