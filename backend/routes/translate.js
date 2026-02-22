const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { translate, SUPPORTED_LANGUAGES } = require('../services/ai/translation');

const translateSchema = Joi.object({
  text: Joi.string().min(1).max(50000).required(),
  targetLanguage: Joi.string()
    .valid(...SUPPORTED_LANGUAGES)
    .required(),
  sourceLanguage: Joi.string()
    .valid(...SUPPORTED_LANGUAGES)
    .optional()
    .allow(null, '')
});

// POST /api/translate - Translate text to target language
router.post('/', async (req, res) => {
  try {
    const { error, value } = translateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { text, targetLanguage, sourceLanguage } = value;
    const translatedText = await translate(text, targetLanguage, sourceLanguage || undefined);

    res.json({
      success: true,
      data: { translatedText, targetLanguage },
      message: 'Translation successful'
    });
  } catch (err) {
    console.error('Translate error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to translate',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
