/**
 * Gemini API client using @google/genai.
 *
 * Model roles (paid tier — $300 credits):
 *   TEXT_MODEL      — story gen, drawing parse, scene expansion  gemini-2.5-flash
 *   EXPANSION_MODEL — scene expansion per page                   gemini-2.5-flash
 *   IMAGE_MODEL     — illustration generation                    gemini-2.5-flash-image
 *                     ("Nano Banana" — fast native Gemini image gen, 1024 px output)
 *                     Uses generateContent() with responseModalities: ['IMAGE'].
 *                     No Imagen API — same key, same SDK, better prompt understanding.
 *
 * Every call retries with exponential backoff on 429 / 503 / RESOURCE_EXHAUSTED.
 */

let ai = null;

async function getClient() {
  if (ai) return ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  const { GoogleGenAI } = await import('@google/genai');
  ai = new GoogleGenAI({ apiKey });
  return ai;
}

// Paid-tier models — billing enabled ($300 credits):
//   gemini-2.5-flash       : ~1000 RPM / 4M TPM — best text quality available
//   gemini-2.5-flash-image : Nano Banana — fast native image gen (~1000 RPM), 1024 px
const TEXT_MODEL      = 'gemini-2.5-flash';         // story gen & drawing parse
const EXPANSION_MODEL = 'gemini-2.5-flash';         // scene expansion
const IMAGE_MODEL     = 'gemini-2.5-flash-image';   // Nano Banana native image generation

const MAX_RETRIES = 4;
const INITIAL_BACKOFF_MS = 2000;

async function withRetry(fn, label = 'Gemini call') {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = err?.status ?? err?.response?.status;
      const msg = String(err?.message || '');
      const retryable = status === 429 || status === 503 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('overloaded');
      if (!retryable || attempt === MAX_RETRIES) throw err;
      const waitMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt) + Math.random() * 500;
      console.warn(`[${label}] Retryable error (attempt ${attempt + 1}/${MAX_RETRIES}), waiting ${Math.round(waitMs)}ms: ${msg.slice(0, 120)}`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
  throw lastError;
}

/** Generate text only. */
async function generateText(contents, options = {}) {
  return withRetry(async () => {
    const client = await getClient();
    const model = options.model || TEXT_MODEL;
    const config = {
      temperature: options.temperature ?? 0.8,
      maxOutputTokens: options.maxOutputTokens ?? 4096,
      ...options.config
    };
    const response = await client.models.generateContent({
      model,
      contents,
      config: { ...config }
    });
    const text = response.text ?? response.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
    if (text == null) throw new Error('No text in Gemini response');
    return String(text).trim();
  }, `generateText(${options.model || TEXT_MODEL})`);
}

/** Multimodal: image(s) + text → text. imageBase64: { mimeType, data }. */
async function generateTextWithImage(imageBase64, textPrompt, options = {}) {
  const contents = [
    { text: textPrompt },
    { inlineData: { mimeType: imageBase64.mimeType || 'image/png', data: imageBase64.data } }
  ];
  return generateText(contents, options);
}

/**
 * Generate one illustration using Gemini native image generation (Nano Banana).
 * Returns { data: base64string, mimeType }.
 *
 * Uses gemini-2.5-flash-image by default via generateContent() with
 * responseModalities: ['IMAGE'].  The model understands rich narrative prompts
 * far better than keyword lists, so always pass a full descriptive paragraph.
 *
 * @param {string}      prompt         - Full narrative image prompt
 * @param {object|null} referenceImage - Optional { mimeType, data } for image-to-image editing
 * @param {object}      options        - { imageModel, aspectRatio }
 */
async function generateImage(prompt, referenceImage = null, options = {}) {
  const model = options.imageModel || IMAGE_MODEL;

  return withRetry(async () => {
    const client = await getClient();

    // Build contents array — text prompt first, then optional reference image
    const contents = referenceImage
      ? [
          { text: prompt },
          { inlineData: { mimeType: referenceImage.mimeType || 'image/png', data: referenceImage.data } }
        ]
      : [{ text: prompt }];

    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: options.aspectRatio || '4:3' }
      }
    });

    // The model may return thought images (part.thought === true) before the final image.
    // We want the LAST non-thought image part (the final rendered output).
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imageParts = parts.filter(p => p.inlineData && !p.thought);
    const part = imageParts[imageParts.length - 1]; // last = final output

    if (!part?.inlineData?.data) {
      // Log all parts for debugging
      console.error('No image in response. Parts:', JSON.stringify(parts.map(p => ({
        hasText: !!p.text,
        hasImage: !!p.inlineData,
        thought: p.thought,
        mimeType: p.inlineData?.mimeType
      }))));
      throw new Error('No image returned from Gemini image model');
    }

    return {
      data: part.inlineData.data,
      mimeType: part.inlineData.mimeType || 'image/png'
    };
  }, `generateImage(${model})`);
}

/** Parse JSON from model text (strip markdown fences if present). */
function parseJsonFromText(text) {
  const stripped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  return JSON.parse(stripped);
}

module.exports = {
  getClient,
  generateText,
  generateTextWithImage,
  generateImage,
  parseJsonFromText,
  TEXT_MODEL,
  EXPANSION_MODEL,
  IMAGE_MODEL,
  withRetry
};
