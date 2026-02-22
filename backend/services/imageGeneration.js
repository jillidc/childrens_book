/**
 * Image generation service using Google Imagen (Gemini API).
 * Generates illustration from text, uploads to storage, returns URL.
 */

const { apiClient, ExternalApiError } = require('../lib/apiClient');
const { storageService } = require('../config/storage');

const IMAGEN_MODEL = 'imagen-4.0-generate-001';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Generate image from text prompt via Imagen API.
 * @param {string} prompt - Text description for the image
 * @param {Object} [options] - { style?, numberOfImages?: 1 }
 * @returns {Promise<{ imageUrl: string, key: string }>} Stored image URL and key
 */
async function generateImage(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const numberOfImages = options.numberOfImages ?? 1;

  try {
    const response = await apiClient.post(
      `${GEMINI_API_BASE}/models/${IMAGEN_MODEL}:predict?key=${apiKey}`,
      {
        instances: [{ prompt: String(prompt).slice(0, 480) }],
        parameters: {
          sampleCount: numberOfImages,
          personGeneration: 'allow_adult'
        }
      },
      { timeout: 60000 }
    );

    const predictions = response.data?.predictions;
    if (!predictions || !predictions.length) {
      throw new Error('No image generated');
    }

    const first = predictions[0];
    const base64 = first.bytesBase64Encoded || first.image?.imageBytes;
    if (!base64) {
      throw new Error('Invalid image response format');
    }

    const buffer = Buffer.from(base64, 'base64');
    const uploadResult = await storageService.uploadGeneratedImage(buffer);

    return {
      imageUrl: uploadResult.url,
      key: uploadResult.key
    };
  } catch (error) {
    if (error instanceof ExternalApiError) {
      console.error('Imagen API Error:', error.message, error.status, error.data);
    } else {
      console.error('Image generation error:', error.message);
    }
    throw new Error('Failed to generate image. Please try again.');
  }
}

module.exports = {
  generateImage,
  IMAGEN_MODEL
};
