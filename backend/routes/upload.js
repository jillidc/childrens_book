const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storageService } = require('../config/storage');
const Joi = require('joi');
const { authMiddleware } = require('../middleware/auth');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Single file upload
  }
});

const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const audioFilter = (req, file, cb) => {
  if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3' || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'), false);
  }
};

const uploadPdf = multer({
  storage,
  fileFilter: pdfFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 }
});

const uploadAudio = multer({
  storage,
  fileFilter: audioFilter,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 }
});

// Validation schema for upload options
const uploadOptionsSchema = Joi.object({
  maxWidth: Joi.number().integer().min(100).max(2000).default(1200),
  maxHeight: Joi.number().integer().min(100).max(2000).default(1200),
  quality: Joi.number().integer().min(1).max(100).default(85),
  format: Joi.string().valid('jpeg', 'png', 'webp').default('jpeg')
});

// POST /api/upload/image - Upload single image (auth required)
router.post('/image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // Validate upload options
    const { error, value } = uploadOptionsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const options = value;
    const file = req.file;

    console.log(`Uploading image: ${file.originalname} (${file.size} bytes)`);

    // Upload and process the image
    const uploadResult = await storageService.uploadImage(
      file.buffer,
      file.originalname,
      options
    );

    res.json({
      success: true,
      data: {
        url: uploadResult.url,
        key: uploadResult.key,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        processedOptions: options
      },
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading image:', error);

    // Handle specific multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 10MB.'
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          error: 'Too many files. Only one file allowed.'
        });
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/upload/pdf - Upload PDF (auth required)
router.post('/pdf', authMiddleware, uploadPdf.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No PDF file provided. Use multipart field "pdf".' });
    }
    const uploadResult = await storageService.uploadPdf(req.file.buffer, req.file.originalname);
    res.json({
      success: true,
      data: { url: uploadResult.url, key: uploadResult.key, originalName: req.file.originalname, size: req.file.size },
      message: 'PDF uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload PDF',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/upload/audio - Upload audio (auth required)
router.post('/audio', authMiddleware, uploadAudio.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided. Use multipart field "audio".' });
    }
    const uploadResult = await storageService.uploadAudio(req.file.buffer, req.file.originalname);
    res.json({
      success: true,
      data: { url: uploadResult.url, key: uploadResult.key, originalName: req.file.originalname, size: req.file.size },
      message: 'Audio uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading audio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload audio',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/upload/multiple - Upload multiple images (auth required)
router.post('/multiple', authMiddleware, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No image files provided'
      });
    }

    // Validate upload options
    const { error, value } = uploadOptionsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const options = value;
    const uploadPromises = req.files.map(async (file) => {
      console.log(`Uploading image: ${file.originalname} (${file.size} bytes)`);

      const uploadResult = await storageService.uploadImage(
        file.buffer,
        file.originalname,
        options
      );

      return {
        url: uploadResult.url,
        key: uploadResult.key,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      };
    });

    const uploadResults = await Promise.all(uploadPromises);

    res.json({
      success: true,
      data: {
        uploads: uploadResults,
        count: uploadResults.length,
        processedOptions: options
      },
      message: `${uploadResults.length} images uploaded successfully`
    });

  } catch (error) {
    console.error('Error uploading multiple images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload images',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/upload/:key - Delete uploaded file
router.delete('/:key(*)', async (req, res) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'File key is required'
      });
    }

    // Check if file exists
    const fileExists = await storageService.fileExists(key);
    if (!fileExists) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    await storageService.deleteFile(key);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/upload/stats - Get storage statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await storageService.getStorageStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting storage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get storage statistics'
    });
  }
});

// GET /api/upload/images - List uploaded images
router.get('/images', async (req, res) => {
  try {
    const { limit = 50, folder = 'drawings/' } = req.query;
    const parsedLimit = Math.min(parseInt(limit), 100);

    const images = await storageService.listFiles(folder, parsedLimit);

    res.json({
      success: true,
      data: {
        images: images,
        count: images.length,
        folder: folder
      }
    });

  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list images'
    });
  }
});

// GET /api/upload/signed-url/:key - Get signed URL for private file access
router.get('/signed-url/:key(*)', async (req, res) => {
  try {
    const { key } = req.params;
    const { expires = 3600 } = req.query; // Default 1 hour

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'File key is required'
      });
    }

    const signedUrl = storageService.getSignedUrl(key, parseInt(expires));

    res.json({
      success: true,
      data: {
        signedUrl: signedUrl,
        expiresIn: expires,
        key: key
      }
    });

  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate signed URL'
    });
  }
});

// Error handling middleware specific to upload routes
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: `Upload error: ${error.message}`
    });
  }

  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      error: 'Only image files are allowed'
    });
  }

  next(error);
});

module.exports = router;