import { classifyWithHeuristics } from './ml-heuristic.js';

let sessionPromise = null;
let sessionError = null;

export async function loadGlyphOnnxSession(modelPath) {
  if (!modelPath) return null;
  if (sessionPromise) return sessionPromise;
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

export async function classifyWithOnnx(input, modelPath) {
  const session = await loadGlyphOnnxSession(modelPath);
  if (!session) return null;

  const features = [
    Number(input.bpm) || 0,
    Number(input.energy) || 0,
    String(input.genre || '').length,
    String(input.title || '').length,
    String(input.artist || '').length,
  ];
  const ort = await import('onnxruntime-node');
  const tensor = new ort.Tensor('float32', Float32Array.from(features), [1, features.length]);
  const feeds = { [session.inputNames[0]]: tensor };
  const result = await session.run(feeds);
  const outKey = session.outputNames[0];
  const data = result[outKey]?.data;
  if (!data || !data.length) return null;

  const genreIdx = Math.round(Number(data[0]));
  const moodIdx = data.length > 1 ? Math.round(Number(data[1])) : 0;
  const GENRES = ['Electronic', 'Rock', 'Pop', 'Hip-Hop', 'Jazz', 'Classical', 'Ambient', 'Unknown'];
  const MOODS = ['Energetic', 'Calm', 'Dark', 'Bright', 'Neutral'];
  return {
    genre: GENRES[genreIdx] || 'Unknown',
    mood: MOODS[moodIdx] || 'Neutral',
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
