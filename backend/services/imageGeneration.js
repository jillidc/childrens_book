/**
 * Image generation service using Nano Banana (Gemini native image gen).
 * Uses gemini-2.5-flash-image via generateContent() with responseModalities: ['IMAGE'].
 * Generates illustration from text, uploads to storage, returns URL.
 */

const gemini = require('./geminiClient');
const { storageService } = require('../config/storage');

/**
 * Generate image from text prompt via Nano Banana (Gemini image model).
 * @param {string} prompt - Text description for the image
 * @param {Object} [options] - { style?, numberOfImages?: 1, aspectRatio?: '4:3' }
 * @returns {Promise<{ imageUrl: string, key: string }>} Stored image URL and key
 */
async function generateImage(prompt, options = {}) {
  try {
    const imageResult = await gemini.generateImage(prompt, null, {
      aspectRatio: options.aspectRatio || '4:3'
    });

    const buffer = Buffer.from(imageResult.data, 'base64');
    const uploadResult = await storageService.uploadGeneratedImage(buffer);

    return {
      imageUrl: uploadResult.url,
      key: uploadResult.key
    };
  } catch (error) {
    console.error('Image generation error (Nano Banana):', error.message);
    throw new Error('Failed to generate image. Please try again.');
  }
}

module.exports = {
  generateImage
};
