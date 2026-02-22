const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { generateStory } = require('../services/ai/textGeneration');
const { translate } = require('../services/ai/translation');

// Validation schema
const generateStorySchema = Joi.object({
  description: Joi.string().min(1).max(2000).required(),
  language: Joi.string().valid('english', 'spanish', 'french', 'chinese').default('english'),
  translationLanguage: Joi.string().valid('english', 'spanish', 'french', 'chinese').optional().allow(null)
});

// POST /api/generate-story - Generate story using AI service layer
router.post('/', async (req, res) => {
  try {
    const { error, value } = generateStorySchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { description, language, translationLanguage } = value;

    console.log(`Generating story for: ${description.substring(0, 80)}... in ${language}`);

    const story = await generateStory(description, language);

    let translatedStory = null;
    if (translationLanguage && translationLanguage !== language) {
      console.log(`Generating translation in: ${translationLanguage}`);
      translatedStory = await translate(story, translationLanguage);
    }

    res.json({
      success: true,
      data: {
        story,
        translatedStory,
        language,
        translationLanguage,
        description,
        generatedAt: new Date().toISOString()
      },
      message: 'Story generated successfully'
    });
  } catch (error) {
    console.error('Error generating story:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate story. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
