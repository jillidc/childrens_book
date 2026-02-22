/**
 * JWT auth middleware. Verifies Bearer token and attaches req.user.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function issueToken(user) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Middleware: require valid JWT. Sets req.user = { id, email, ... } (no password).
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authorization required' });
  }

  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    return res.status(401).json({ success: false, error: 'User not found' });
  }

  req.user = user;
  next();
}

/**
 * Optional auth: if Bearer token present and valid, set req.user; otherwise continue without user.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return next();
  }

  const user = await User.findById(decoded.userId);
  if (user) {
    req.user = user;
  }
  next();
}

module.exports = {
  authMiddleware,
  optionalAuth,
  issueToken,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
