/**
 * Gemini API client using @google/genai.
 * Text + Image Parsing: gemini-3-flash-preview
 * Image Generation:     gemini-2.5-flash-image
 *
 * Preview models have tighter rate limits. Every call retries
 * with exponential backoff on 429 / 503 / RESOURCE_EXHAUSTED.
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

const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-preview-image-generation';

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

/** Generate one image. Returns { data: base64, mimeType }. */
async function generateImage(prompt, referenceImage = null, options = {}) {
  return withRetry(async () => {
    const client = await getClient();
    const contents = referenceImage
      ? [
          { text: prompt },
          { inlineData: { mimeType: referenceImage.mimeType || 'image/png', data: referenceImage.data } }
        ]
      : prompt;
    const config = {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: options.aspectRatio || '4:3' },
      ...options.config
    };
    const response = await client.models.generateContent({
      model: options.imageModel || IMAGE_MODEL,
      contents,
      config
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData?.data) throw new Error('No image in Gemini response');
    return {
      data: part.inlineData.data,
      mimeType: part.inlineData.mimeType || 'image/png'
    };
  }, 'generateImage');
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
  IMAGE_MODEL,
  withRetry
};
