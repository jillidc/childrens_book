/**
 * Translation service using Gemini 2.0 Flash.
 * Standalone translate-text for Learn and Read / on-demand translation.
 */

const { apiClient, ExternalApiError } = require('../../lib/apiClient');

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const SUPPORTED_LANGUAGES = ['english', 'spanish', 'french', 'chinese'];

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
];

function getTranslatePrompt(text, targetLanguage, sourceLanguage) {
  const sourceHint = sourceLanguage
    ? ` The text is in ${sourceLanguage}.`
    : ' Detect the source language if needed.';
  return `Translate the following text into ${targetLanguage}.${sourceHint}
Preserve meaning, tone, and any child-friendly style. Output only the translated text, no explanations.

Text to translate:
${text}`;
}

/**
 * Translate text to a target language.
 * @param {string} text - Source text
 * @param {string} targetLanguage - One of english, spanish, french, chinese
 * @param {string} [sourceLanguage] - Optional hint for source language
 * @returns {Promise<string>} Translated text
 */
async function translate(text, targetLanguage, sourceLanguage = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
    throw new Error(`Unsupported target language: ${targetLanguage}`);
  }

  const prompt = getTranslatePrompt(text, targetLanguage, sourceLanguage);

  try {
    const response = await apiClient.post(
      `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
        },
        safetySettings: SAFETY_SETTINGS
      },
      { timeout: 15000 }
    );

    if (response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.data.candidates[0].content.parts[0].text.trim();
    }
    throw new Error('Invalid response format from Gemini API');
  } catch (error) {
    if (error instanceof ExternalApiError) {
      console.error('Gemini Translation Error:', error.message, error.status, error.data);
    } else {
      console.error('Gemini Translation Error:', error.message);
    }
    const message =
      process.env.NODE_ENV === 'development'
        ? (error.message || 'Failed to translate')
        : 'Failed to translate text. Please try again.';
    throw new Error(message);
  }
}

module.exports = {
  translate,
  SUPPORTED_LANGUAGES,
  getTranslatePrompt
};
