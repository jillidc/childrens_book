const express = require('express');
const router = express.Router();
const Joi = require('joi');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { authMiddleware, issueToken } = require('../middleware/auth');

const BCRYPT_ROUNDS = 10;

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  username: Joi.string().min(1).max(100).optional().allow(null, '')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { email, password, username } = value;

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = new User({
      email,
      username: username || null,
      passwordHash
    });
    await user.save();

    const token = issueToken(user);
    res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      },
      message: 'Registered successfully'
    });
  } catch (err) {
    console.error('Auth register error:', err);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { email, password } = value;

    const user = await User.findByEmail(email);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = issueToken(user);
    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      },
      message: 'Login successful'
    });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/auth/me - current user (requires JWT)
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: req.user.toJSON()
  });
});

module.exports = router;
