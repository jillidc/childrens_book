/**
 * Image description service using Gemini (vision).
 * Converts drawing image to short text description for story generation.
 */

const { apiClient, ExternalApiError } = require('../../lib/apiClient');

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const DEFAULT_PROMPT = `Look at this drawing and describe what you see in 2-4 short sentences, suitable for a children's story.
Focus on: main characters or objects, setting, colors, and any clear story elements.
Write in a friendly, simple way. Output only the description, no preamble.`;

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
];

/**
 * Describe an image (drawing) for use in story generation.
 * @param {Buffer} imageBuffer - Raw image bytes
 * @param {string} [mimeType='image/jpeg'] - MIME type of the image
 * @param {string} [prompt] - Optional custom prompt (default: child-friendly description)
 * @returns {Promise<string>} Short description text
 */
async function describeImage(imageBuffer, mimeType = 'image/jpeg', prompt = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const base64Data = imageBuffer.toString('base64');
  const textPrompt = prompt ?? DEFAULT_PROMPT;

  try {
    const response = await apiClient.post(
      `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              },
              { text: textPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 256
        },
        safetySettings: SAFETY_SETTINGS
      },
      { timeout: 30000 }
    );

    if (response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.data.candidates[0].content.parts[0].text.trim();
    }
    throw new Error('Invalid response format from Gemini API');
  } catch (error) {
    if (error instanceof ExternalApiError) {
      console.error('Gemini Vision Error:', error.message, error.status, error.data);
    } else {
      console.error('Gemini Vision Error:', error.message);
    }
    throw new Error('Failed to describe image. Please try again.');
  }
}

module.exports = {
  describeImage,
  DEFAULT_PROMPT
};
