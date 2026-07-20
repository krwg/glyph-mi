import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { classifyWithHeuristics } from './ml-heuristic.js';

/** Must match scripts/train-glyph-genre.py FEATURE_NAMES / FEATURE_DIM. */
export const ONNX_FEATURE_NAMES = ['bpm', 'energy', 'title_len', 'artist_len'];
export const ONNX_FEATURE_DIM = 4;

let sessionPromise = null;
let sessionModelPath = null;
let sessionError = null;
let labelsCache = new Map();

export function buildOnnxFeatures(input = {}) {
  return [
    Number(input.bpm) || 0,
    Number(input.energy) || 0,
    String(input.title || '').length,
    String(input.artist || '').length,
  ];
}

export function labelsPathForModel(modelPath) {
  if (!modelPath) return null;
  return join(dirname(modelPath), 'genre-labels.json');
}

export async function loadGenreLabels(modelPath) {
  const labelsPath = labelsPathForModel(modelPath);
  if (!labelsPath) return null;
  if (labelsCache.has(labelsPath)) return labelsCache.get(labelsPath);
  try {
    const raw = JSON.parse(await readFile(labelsPath, 'utf8'));
    const labels = Array.isArray(raw) ? raw : raw.labels;
    if (!Array.isArray(labels) || !labels.length) {
      labelsCache.set(labelsPath, null);
      return null;
    }
    const spec = {
      labels,
      featureDim: Number(raw.featureDim) || ONNX_FEATURE_DIM,
      featureNames: Array.isArray(raw.featureNames) ? raw.featureNames : ONNX_FEATURE_NAMES,
    };
    labelsCache.set(labelsPath, spec);
    return spec;
  } catch (err) {
    sessionError = err;
    labelsCache.set(labelsPath, null);
    return null;
  }
}

export async function loadGlyphOnnxSession(modelPath) {
  if (!modelPath) return null;
  if (sessionPromise && sessionModelPath === modelPath) return sessionPromise;
  sessionModelPath = modelPath;
  sessionPromise = (async () => {
    try {
      const ort = await import('onnxruntime-node');
      return ort.InferenceSession.create(modelPath);
    } catch (err) {
      sessionError = err;
      return null;
    }
  })();
  return sessionPromise;
}

function readPredictedIndex(data) {
  if (!data || !data.length) return null;
  // skl2onnx RandomForest label output is typically a single int; probabilities use argmax
  if (data.length === 1) return Math.round(Number(data[0]));
  let bestIdx = 0;
  let bestVal = Number(data[0]);
  for (let i = 1; i < data.length; i++) {
    const v = Number(data[i]);
    if (v > bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export async function classifyWithOnnx(input, modelPath) {
  const labelSpec = await loadGenreLabels(modelPath);
  if (!labelSpec?.labels?.length) return null;

  const session = await loadGlyphOnnxSession(modelPath);
  if (!session) return null;

  const features = buildOnnxFeatures(input);
  if (features.length !== (labelSpec.featureDim || ONNX_FEATURE_DIM)) return null;

  const ort = await import('onnxruntime-node');
  const tensor = new ort.Tensor('float32', Float32Array.from(features), [1, features.length]);
  const feeds = { [session.inputNames[0]]: tensor };
  const result = await session.run(feeds);
  const outKey = session.outputNames[0];
  const data = result[outKey]?.data;
  const genreIdx = readPredictedIndex(data);
  if (genreIdx == null || genreIdx < 0) return null;

  const genre = labelSpec.labels[genreIdx] || 'Unknown';
  const heuristic = classifyWithHeuristics(input);
  return {
    genre,
    mood: heuristic.mood || 'Neutral',
    confidence: 0.72,
    fromOnnx: true,
    reasons: ['glyph-onnx: model inference'],
  };
}

export async function classifyGenreMood(input, options = {}) {
  const modelPath = options.modelPath || options.onnxModelPath;
  if (modelPath) {
    const onnx = await classifyWithOnnx(input, modelPath);
    if (onnx) return onnx;
  }
  return classifyWithHeuristics(input);
}

export function getOnnxLoadError() {
  return sessionError;
}

/** Test helper — clears session/label caches. */
export function resetOnnxCaches() {
  sessionPromise = null;
  sessionModelPath = null;
  sessionError = null;
  labelsCache = new Map();
}
