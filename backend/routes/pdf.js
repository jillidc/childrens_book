const express = require('express');
const router = express.Router();
const multer = require('multer');
const Joi = require('joi');
const { parsePdf } = require('../services/pdfParser');
const { authMiddleware } = require('../middleware/auth');

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 }
});

// POST /api/pdf/parse - Parse uploaded PDF (multipart), return structured text
router.post('/parse', authMiddleware, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file provided. Use multipart field "pdf".'
      });
    }

    const result = await parsePdf(req.file.buffer);

    res.json({
      success: true,
      data: {
        pages: result.pages,
        fullText: result.fullText,
        numPages: result.numPages
      },
      message: 'PDF parsed successfully'
    });
  } catch (err) {
    console.error('PDF parse route error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to parse PDF',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
