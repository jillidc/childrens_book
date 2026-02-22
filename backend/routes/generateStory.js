const express = require('express');
const router = express.Router();
const Joi = require('joi');
const gemini = require('../services/geminiClient');
const prompts = require('../prompts');
const { storageService } = require('../config/storage');

const generateStorySchema = Joi.object({
  description: Joi.string().min(1).max(2000).required(),
  language: Joi.string().valid('english', 'spanish', 'french', 'chinese').default('english'),
  translationLanguage: Joi.string().valid('english', 'spanish', 'french', 'chinese').optional().allow(null),
  imageUrl: Joi.string().max(500000).optional().allow(null, ''),
  imageBase64: Joi.object({
    mimeType: Joi.string().optional(),
    data: Joi.string().required()
  }).optional()
});

async function fetchImageAsBase64(url) {
  const axios = require('axios');
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
  const data = Buffer.from(res.data).toString('base64');
  const mimeType = res.headers['content-type']?.split(';')[0] || 'image/png';
  return { data, mimeType };
}

async function uploadOrDataUrl(buffer, mimeType) {
  try {
    const result = await storageService.uploadImageBuffer(buffer, mimeType, 'generated');
    return result.url;
  } catch (e) {
    console.warn('Storage upload failed, using data URL:', e.message);
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
}

async function parseDrawingToJson(imageBase64, userDescription = '') {
  const prompt = prompts.DRAWING_PARSE_JSON + (userDescription ? `\n\nThe child also said: "${userDescription}"` : '');
  const text = await gemini.generateTextWithImage(imageBase64, prompt);
  return gemini.parseJsonFromText(text);
}

async function generateStoryPages(parsedJsonOrDescription, language, useJson) {
  const prompt = useJson
    ? prompts.getStoryFromJsonPrompt(parsedJsonOrDescription, language)
    : prompts.getStoryFromDescriptionPrompt(parsedJsonOrDescription, language);
  const text = await gemini.generateText(prompt);
  const pages = gemini.parseJsonFromText(text);
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error('Story must be a non-empty array of page strings');
  }
  return pages.slice(0, 10);
}

/**
 * Generate illustrations SEQUENTIALLY (not parallel) to stay
 * within preview-model rate limits. Each page prompt carries
 * the character DNA + art-style note for visual consistency.
 */
async function generatePageImages(pages, parsedJson, referenceImage) {
  const characterDNA = prompts.buildCharacterDNA(parsedJson);
  const artStyle = parsedJson?.artStyle || '';
  const results = [];

  for (const pageText of pages) {
    const prompt = prompts.getPageIllustrationPrompt(pageText, characterDNA, artStyle);
    try {
      const imageResult = await gemini.generateImage(prompt, referenceImage, { aspectRatio: '4:3' });
      const buffer = Buffer.from(imageResult.data, 'base64');
      const url = await uploadOrDataUrl(buffer, imageResult.mimeType || 'image/png');
      results.push({ text: pageText, imageUrl: url });
    } catch (err) {
      console.warn(`Image gen failed for page, skipping: ${err.message}`);
      results.push({ text: pageText, imageUrl: null });
    }
  }
  return results;
}

function getFallbackStory(description, language) {
  const stories = {
    english: `Once upon a time, there was a magical drawing that came to life! Your wonderful creation - ${description} - became the hero of an incredible adventure.\n\nThrough enchanted forests and over sparkling mountains, our brave character discovered that every line and color in the drawing held special powers. Along the way, they met friendly creatures who became the best of friends.\n\nTogether, they learned that imagination is the most powerful magic of all. The End.`,
    spanish: `Había una vez un dibujo mágico que cobró vida! Tu maravillosa creación - ${description} - se convirtió en el héroe de una aventura increíble. Fin.`,
    french: `Il était une fois un dessin magique qui a pris vie! Votre merveilleuse création - ${description} - est devenue le héros d'une aventure incroyable. Fin.`,
    chinese: `从前，有一个神奇的画作活了过来！你的精彩创作——${description}——成为了一场不可思议冒险的英雄。完。`
  };
  return stories[language] || stories.english;
}

// POST /api/generate-story
router.post('/', async (req, res) => {
  try {
    const { error, value } = generateStorySchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { description, language, translationLanguage, imageUrl, imageBase64 } = value;

    let imageForParsing = imageBase64 || null;
    if (!imageForParsing && imageUrl) {
      if (imageUrl.startsWith('data:')) {
        const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) imageForParsing = { mimeType: match[1], data: match[2] };
      } else {
        try {
          imageForParsing = await fetchImageAsBase64(imageUrl);
        } catch (e) {
          console.warn('Could not fetch image from URL:', e.message);
        }
      }
    }

    let pages = [];
    let fullText = '';
    let translatedPages = null;

    try {
      let parsedJson = null;
      if (imageForParsing) {
        try {
          parsedJson = await parseDrawingToJson(imageForParsing, description);
          console.log('Drawing parsed:', JSON.stringify(parsedJson).slice(0, 200));
        } catch (e) {
          console.warn('Drawing parse failed, using description only:', e.message);
        }
      }

      if (parsedJson) {
        pages = await generateStoryPages(parsedJson, language, true);
      } else {
        pages = await generateStoryPages(description, language, false);
      }

      fullText = pages.join('\n\n');

      const pageResults = await generatePageImages(
        pages,
        parsedJson || {},
        imageForParsing
      );

      if (translationLanguage && translationLanguage !== language) {
        try {
          const translatedFull = await gemini.generateText(
            prompts.getStoryFromDescriptionPrompt(description, translationLanguage)
          );
          const translatedArr = gemini.parseJsonFromText(translatedFull);
          translatedPages = Array.isArray(translatedArr) ? translatedArr : [translatedFull];
        } catch (e) {
          console.warn('Translation failed:', e.message);
        }
      }

      res.json({
        success: true,
        data: {
          pages: pageResults,
          fullText,
          story: fullText,
          translatedStory: translatedPages ? translatedPages.join('\n\n') : null,
          translatedPages: translatedPages || null,
          language,
          translationLanguage: translationLanguage || null,
          description,
          generatedAt: new Date().toISOString()
        },
        message: 'Story generated successfully'
      });
    } catch (err) {
      console.error('Gemini generation error:', err);
      const fallbackText = getFallbackStory(description, language);
      res.json({
        success: true,
        data: {
          pages: [{ text: fallbackText, imageUrl: null }],
          fullText: fallbackText,
          story: fallbackText,
          translatedStory: null,
          translatedPages: null,
          language,
          translationLanguage: null,
          description,
          generatedAt: new Date().toISOString(),
          fallback: true
        },
        message: 'Story generated (fallback)'
      });
    }
  } catch (error) {
    console.error('Generate story error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate story. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
