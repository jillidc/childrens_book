const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { generateImage } = require('../services/imageGeneration');

const schema = Joi.object({
  prompt: Joi.string().min(1).max(1000).required(),
  style: Joi.string().max(200).optional().allow(null, ''),
  size: Joi.string().valid('1:1', '4:3', '3:4', '16:9', '9:16').optional()
});

// POST /api/generate-image - Generate image from text (Nano Banana), store, return URL
router.post('/', async (req, res) => {
  try {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { prompt, style, size } = value;
    const fullPrompt = style ? `${prompt}, ${style}` : prompt;

    const result = await generateImage(fullPrompt, {
      aspectRatio: size || '4:3'
    });

    res.json({
      success: true,
      data: { imageUrl: result.imageUrl, key: result.key },
      message: 'Image generated successfully'
    });
  } catch (err) {
    console.error('Generate image error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate image',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
