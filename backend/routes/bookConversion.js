const express = require('express');
const router = express.Router();
const Joi = require('joi');
const gemini = require('../services/geminiClient');
const prompts = require('../prompts');
const { storageService } = require('../config/storage');

const MAX_CHUNK_LENGTH = 5000;
const BOOK_CONVERSION_SCHEMA = Joi.object({
  rawText: Joi.string().min(1).max(500000).required()
});

async function uploadOrDataUrl(buffer, mimeType) {
  try {
    const result = await storageService.uploadImageBuffer(buffer, mimeType, 'book-illustrations');
    return result.url;
  } catch (e) {
    console.warn('Storage upload failed, using data URL:', e.message);
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
}

/** Simplify long text in chunks and concatenate. */
async function simplifyText(rawText) {
  if (rawText.length <= MAX_CHUNK_LENGTH) {
    return gemini.generateText(prompts.getSimplifyPrompt(rawText));
  }
  const chunks = [];
  for (let i = 0; i < rawText.length; i += MAX_CHUNK_LENGTH) {
    chunks.push(rawText.slice(i, i + MAX_CHUNK_LENGTH));
  }
  const results = [];
  for (const chunk of chunks) {
    results.push(await gemini.generateText(prompts.getSimplifyPrompt(chunk)));
  }
  return results.join('\n\n');
}

/**
 * Extract character visual summaries from simplified text
 * so we can thread them into every image prompt.
 */
async function extractCharacters(simplifiedText) {
  try {
    const text = await gemini.generateText(prompts.getExtractCharactersPrompt(simplifiedText));
    const chars = gemini.parseJsonFromText(text);
    if (!Array.isArray(chars)) return '';
    return chars.map(c => `"${c.name}" — ${c.appearance}`).join('. ');
  } catch (e) {
    console.warn('Character extraction failed:', e.message);
    return '';
  }
}

async function identifyScenes(simplifiedText) {
  const prompt = prompts.getSceneIdentificationPrompt(simplifiedText);
  const text = await gemini.generateText(prompt);
  const scenes = gemini.parseJsonFromText(text);
  if (!Array.isArray(scenes) || scenes.length === 0) throw new Error('No scenes returned');
  return scenes.slice(0, 10);
}

/**
 * Generate book illustrations SEQUENTIALLY to stay within
 * preview-model rate limits. Character summary is threaded
 * into every prompt for visual consistency.
 */
async function generateBookImages(sceneDescriptions, characterSummary) {
  const results = [];
  for (let i = 0; i < sceneDescriptions.length; i++) {
    const desc = sceneDescriptions[i];
    const prompt = prompts.getBookSceneIllustrationPrompt(desc, characterSummary);
    try {
      const imageResult = await gemini.generateImage(prompt, null, { aspectRatio: '4:3' });
      const buffer = Buffer.from(imageResult.data, 'base64');
      const url = await uploadOrDataUrl(buffer, imageResult.mimeType || 'image/png');
      results.push({ index: i + 1, description: desc, imageUrl: url });
    } catch (err) {
      console.warn(`Book image gen failed for scene ${i + 1}: ${err.message}`);
      results.push({ index: i + 1, description: desc, imageUrl: null });
    }
  }
  return results;
}

// POST /api/book-conversion
router.post('/', async (req, res) => {
  try {
    const { error, value } = BOOK_CONVERSION_SCHEMA.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { rawText } = value;
    console.log(`Book conversion: ${rawText.length} chars of raw text`);

    const simplifiedText = await simplifyText(rawText);
    console.log(`Simplified to ${simplifiedText.length} chars`);

    const characterSummary = await extractCharacters(simplifiedText);
    if (characterSummary) console.log(`Characters: ${characterSummary.slice(0, 150)}`);

    const sceneDescriptions = await identifyScenes(simplifiedText);
    console.log(`Identified ${sceneDescriptions.length} scenes`);

    const scenes = await generateBookImages(sceneDescriptions, characterSummary);

    res.json({
      success: true,
      data: {
        simplifiedText,
        scenes,
        characterSummary: characterSummary || null,
        generatedAt: new Date().toISOString()
      },
      message: 'Book conversion completed'
    });
  } catch (err) {
    console.error('Book conversion error:', err);
    res.status(500).json({
      success: false,
      error: 'Book conversion failed. Please try again.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
