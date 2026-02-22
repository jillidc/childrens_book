const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Story = require('../models/Story');

// Validation schemas
const createStorySchema = Joi.object({
  userId: Joi.string().uuid().optional().allow(null),
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().min(1).max(2000).required(),
  storyText: Joi.string().min(1).max(200000).required(),
  language: Joi.string().valid('english', 'spanish', 'french', 'chinese').default('english'),
  translationLanguage: Joi.string().valid('english', 'spanish', 'french', 'chinese').optional().allow(null),
  imageUrl: Joi.string().max(10000).optional().allow(null, ''),
  imageFileName: Joi.string().max(255).optional().allow(null),
  audioUrl: Joi.string().uri().optional().allow(null)
});

const updateStorySchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().min(1).max(2000).optional(),
  storyText: Joi.string().min(1).max(200000).optional(),
  language: Joi.string().valid('english', 'spanish', 'french', 'chinese').optional(),
  translationLanguage: Joi.string().valid('english', 'spanish', 'french', 'chinese').optional().allow(null),
  audioUrl: Joi.string().uri().optional().allow(null)
});

// GET /api/stories - Get all stories with pagination
router.get('/', async (req, res) => {
  try {
    const { userId, limit = 50, offset = 0 } = req.query;

    const parsedLimit = Math.min(parseInt(limit), 100); // Max 100 stories per request
    const parsedOffset = parseInt(offset) || 0;

    let stories;
    if (userId) {
      stories = await Story.findByUserId(userId, parsedLimit, parsedOffset);
    } else {
      stories = await Story.findAll(parsedLimit, parsedOffset);
    }

    res.json({
      success: true,
      data: stories.map(story => story.toJSON()),
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        count: stories.length
      }
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stories'
    });
  }
});

// GET /api/stories/:id - Get specific story
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Story ID is required'
      });
    }

    const story = await Story.findById(id);

    if (!story) {
      return res.status(404).json({
        success: false,
        error: 'Story not found'
      });
    }

    res.json({
      success: true,
      data: story.toJSON()
    });
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch story'
    });
  }
});

// POST /api/stories - Create new story
router.post('/', async (req, res) => {
  try {
    const { error, value } = createStorySchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const story = new Story(value);
    await story.save();

    res.status(201).json({
      success: true,
      data: story.toJSON(),
      message: 'Story created successfully'
    });
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create story'
    });
  }
});

// PUT /api/stories/:id - Update story
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateStorySchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const story = await Story.findById(id);

    if (!story) {
      return res.status(404).json({
        success: false,
        error: 'Story not found'
      });
    }

    // Update story properties
    Object.assign(story, value);
    await story.update();

    res.json({
      success: true,
      data: story.toJSON(),
      message: 'Story updated successfully'
    });
  } catch (error) {
    console.error('Error updating story:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update story'
    });
  }
});

// DELETE /api/stories/:id - Delete story
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const story = await Story.findById(id);

    if (!story) {
      return res.status(404).json({
        success: false,
        error: 'Story not found'
      });
    }

    await Story.deleteById(id);

    res.json({
      success: true,
      message: 'Story deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete story'
    });
  }
});

module.exports = router;