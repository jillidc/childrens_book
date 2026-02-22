const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS first so preflight and all responses get Access-Control-* headers
// FRONTEND_URL (comma-separated) + any *.vercel.app so preview deploys work
const frontendUrls = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (frontendUrls.includes(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting — JSON responses so the frontend can parse them
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);

// Per-route-group rate limiters (separate counters so TTS doesn't eat into story gen quota)
function makeStrictLimiter(max) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    message: { error: 'Too many requests to this endpoint, please try again later.' }
  });
}
const storyGenLimiter = makeStrictLimiter(15);
const ttsLimiter      = makeStrictLimiter(60);
const aiLimiter       = makeStrictLimiter(20);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/generate-story', storyGenLimiter, require('./routes/generateStory'));
app.use('/api/text-to-speech', ttsLimiter, require('./routes/textToSpeech'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/users', require('./routes/users'));
app.use('/api/describe-image', aiLimiter, require('./routes/describeImage'));
app.use('/api/generate-image', aiLimiter, require('./routes/imageGeneration'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Draw My Story API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request entity too large' });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Draw My Story API server running on port ${PORT}`);
  console.log(`📱 CORS: ${frontendUrls.join(', ') || 'none'}, *.vercel.app`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});