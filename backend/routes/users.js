const express = require('express');
const router = express.Router();
const Joi = require('joi');
const User = require('../models/User');

// Validation schemas
const createUserSchema = Joi.object({
  walletAddress: Joi.string().optional().allow(null),
  username: Joi.string().min(1).max(100).optional().allow(null),
  email: Joi.string().email().optional().allow(null)
});

const updateUserSchema = Joi.object({
  username: Joi.string().min(1).max(100).optional().allow(null),
  email: Joi.string().email().optional().allow(null)
});

// POST /api/users - Create or find user by wallet
router.post('/', async (req, res) => {
  try {
    const { error, value } = createUserSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    let user;

    if (value.walletAddress) {
      // Find or create user by wallet address
      user = await User.findOrCreateByWallet(value.walletAddress);

      // Update other fields if provided
      if (value.username) user.username = value.username;
      if (value.email) user.email = value.email;

      if (value.username || value.email) {
        await user.update();
      }
    } else {
      // Create anonymous user
      user = new User(value);
      await user.save();
    }

    res.status(201).json({
      success: true,
      data: user.toJSON(),
      message: 'User created/updated successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// GET /api/users/wallet/:address - Get user by wallet address
router.get('/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;

    const user = await User.findByWalletAddress(address);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Error fetching user by wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateUserSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update user properties
    Object.assign(user, value);
    await user.update();

    res.json({
      success: true,
      data: user.toJSON(),
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await User.deleteById(id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

module.exports = router;