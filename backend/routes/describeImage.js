const express = require('express');
const router = express.Router();
const multer = require('multer');
const { describeImage } = require('../services/ai/imageDescription');

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }
});

const MIME_TO_EXT = {
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/webp': 'image/webp',
  'image/gif': 'image/gif'
};

// POST /api/describe-image - Describe drawing image for story generation (multipart image)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided. Use multipart field "image".'
      });
    }

    const mimeType = MIME_TO_EXT[req.file.mimetype] || 'image/jpeg';
    const description = await describeImage(req.file.buffer, mimeType);

    res.json({
      success: true,
      data: { description },
      message: 'Image described successfully'
    });
  } catch (err) {
    console.error('Describe image error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to describe image',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
