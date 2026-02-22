# Draw My Story Backend

Backend API server for the Draw My Story application - a children's story generation app that uses AI to create personalized stories from drawings.

## Features

- **Story Generation**: AI-powered story creation using Google Gemini API
- **Text-to-Speech**: Audio narration using ElevenLabs API
- **Image Upload**: Secure image storage with DigitalOcean Spaces
- **Database**: Persistent storage using Snowflake
- **Multi-language**: Support for English, Spanish, French, and Chinese
- **RESTful API**: Clean REST endpoints for frontend integration

## Tech Stack

- **Runtime**: Node.js with Express.js
- **Database**: Snowflake (cloud data warehouse)
- **File Storage**: DigitalOcean Spaces (S3-compatible)
- **AI Services**: Google Gemini Pro, ElevenLabs TTS
- **Image Processing**: Sharp for optimization
- **Validation**: Joi for request validation
- **Security**: Helmet, CORS, Rate limiting

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```

Fill in your API keys and database credentials in the `.env` file:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# API Keys
GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Snowflake Database
SNOWFLAKE_ACCOUNT=your_account_identifier
SNOWFLAKE_USERNAME=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_DATABASE=DRAW_MY_STORY
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_WAREHOUSE=COMPUTE_WH

# DigitalOcean Spaces
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_BUCKET=draw-my-story-images
DO_SPACES_ACCESS_KEY=your_access_key
DO_SPACES_SECRET_KEY=your_secret_key
DO_SPACES_REGION=nyc3
```

### 3. Initialize Database
```bash
npm run init-db
```

Or with sample data:
```bash
npm run init-db-with-samples
```

**Existing databases:** If you already had tables before auth or story columns were added, run migrations once:
```bash
node scripts/migrateAddPasswordHash.js   # adds users.password_hash
node scripts/migrateStoryColumns.js      # adds stories.source_type, source_file_key, generated_image_url
node scripts/migrateDropWallet.js        # drops users.wallet_address (after removing Solana)
```

### 4. Start Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Health Check
- `GET /api/health` - Server status

### Authentication (no auth required for these)
- `POST /api/auth/register` - Register with `{ email, password, username? }`; returns `{ user, token }`
- `POST /api/auth/login` - Login with `{ email, password }`; returns `{ user, token }`
- `GET /api/auth/me` - Current user (requires `Authorization: Bearer <token>`)

**Protected routes** (require `Authorization: Bearer <token>` in header): story create/update/delete, upload image/pdf/audio, PDF parse.

### Story Management
- `GET /api/stories` - List all stories (with pagination)
- `GET /api/stories/:id` - Get specific story
- `POST /api/stories` - Create new story
- `PUT /api/stories/:id` - Update story
- `DELETE /api/stories/:id` - Delete story

### Story Generation
- `POST /api/generate-story` - Generate story with Gemini AI

### Text-to-Speech
- `GET /api/text-to-speech/voices` - List available voices
- `POST /api/text-to-speech/generate` - Generate audio from text
- `POST /api/text-to-speech/stream` - Stream audio generation

### File Upload (image/pdf/audio require auth)
- `POST /api/upload/image` - Upload single image
- `POST /api/upload/multiple` - Upload multiple images
- `POST /api/upload/pdf` - Upload PDF
- `POST /api/upload/audio` - Upload audio (e.g. TTS)
- `DELETE /api/upload/:key` - Delete uploaded file
- `GET /api/upload/stats` - Storage statistics
- `GET /api/upload/images` - List uploaded images

### PDF & AI
- `POST /api/pdf/parse` - Parse uploaded PDF (multipart `pdf`); returns `{ pages, fullText, numPages }` (auth required)
- `POST /api/describe-image` - Describe drawing image for story (multipart `image`); returns `{ description }`
- `POST /api/translate` - Translate text: `{ text, targetLanguage, sourceLanguage? }` → `{ translatedText }`
- `POST /api/generate-image` - Generate image from prompt: `{ prompt, style? }` → `{ imageUrl, key }`

### User Management
- `POST /api/users` - Create/find user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Request/Response Examples

### Generate Story
```bash
curl -X POST http://localhost:5000/api/generate-story \
  -H "Content-Type: application/json" \
  -d '{
    "description": "A friendly dragon playing with butterflies",
    "language": "english"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "story": "Once upon a time, there was a gentle dragon...",
    "language": "english",
    "description": "A friendly dragon playing with butterflies",
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Upload Image (requires auth)
```bash
curl -X POST http://localhost:5000/api/upload/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@drawing.jpg" \
  -F "maxWidth=800" \
  -F "quality=90"
```

### Create Story (requires auth)
```bash
curl -X POST http://localhost:5000/api/stories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "My Dragon Story",
    "description": "A friendly dragon playing with butterflies",
    "storyText": "Once upon a time...",
    "language": "english",
    "imageUrl": "https://spaces.com/image.jpg"
  }'
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(100),
  email VARCHAR(255),
  password_hash VARCHAR(255),
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
```

### Stories Table
```sql
CREATE TABLE stories (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  story_text TEXT NOT NULL,
  language VARCHAR(50) DEFAULT 'english',
  translation_language VARCHAR(50),
  image_url VARCHAR(512),
  image_file_name VARCHAR(255),
  audio_url VARCHAR(512),
  source_type VARCHAR(50),
  source_file_key VARCHAR(512),
  generated_image_url VARCHAR(512),
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Configuration

### Environment Variables
All sensitive configuration is handled through environment variables. See `.env.example` for required variables.

- **JWT_SECRET** – Required for auth; set a long random string (e.g. `openssl rand -hex 32`).
- **GEMINI_API_KEY** – Used for story generation, image description, translation, and (if enabled) image generation (Imagen).

### API Rate Limits
- Default: 100 requests per 15 minutes per IP
- Configurable through middleware

### File Upload Limits
- Max file size: 10MB
- Supported formats: JPEG, PNG, WebP
- Images are automatically optimized and resized

## Deployment

### DigitalOcean App Platform
1. Connect your repository
2. Set environment variables in the dashboard
3. Deploy with automatic builds

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Set up SSL/HTTPS
- [ ] Configure monitoring and logging
- [ ] Set up database backups
- [ ] Configure CDN for static assets

## Development

### Scripts
- `npm run dev` - Development server with auto-reload
- `npm run start` - Production server
- `npm run test` - Run tests
- `npm run init-db` - Initialize database tables
- `npm run init-db-with-samples` - Initialize with sample data
- `node scripts/migrateAddPasswordHash.js` - Add `password_hash` to existing users table
- `node scripts/migrateStoryColumns.js` - Add story columns (source_type, source_file_key, generated_image_url)
- `node scripts/migrateDropWallet.js` - Drop `wallet_address` from users (run after removing Solana)

### Testing without frontend

**Option 1 – Run the smoke test script** (with backend running in another terminal):
```bash
npm run dev   # in one terminal
node scripts/test-api.js   # in another
```
This hits health, register, login, /me, create story, list stories, and translate.

**Option 2 – curl from terminal** (replace `YOUR_TOKEN` after register/login):
```bash
# Health
curl -s http://localhost:5000/api/health | jq

# Register
curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword","username":"You"}' | jq

# Login (copy token from response)
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}' | jq

# Current user (use token from login)
curl -s http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# Create story (protected)
curl -s -X POST http://localhost:5000/api/stories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"My Story","description":"A dragon","storyText":"Once upon a time...","language":"english"}' | jq
```
Use your backend port if different (e.g. 5001). `jq` is optional (pretty-prints JSON).

### Testing
```bash
npm test
```

### Code Style
The project follows standard Node.js conventions with:
- Express.js routing patterns
- Async/await for promises
- Joi for validation
- Proper error handling
- Security best practices

## API Keys Setup Guide

### Google Gemini API
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create a new project or select existing
3. Generate API key
4. Add to `.env` as `GEMINI_API_KEY`

### ElevenLabs API
1. Sign up at [ElevenLabs](https://elevenlabs.io/)
2. Go to Profile & API Key section
3. Generate API key
4. Add to `.env` as `ELEVENLABS_API_KEY`

### Snowflake Database
1. Sign up for Snowflake account
2. Create database named `DRAW_MY_STORY`
3. Note your account identifier, username, password
4. Add credentials to `.env`

### DigitalOcean Spaces
1. Create DigitalOcean account
2. Navigate to Spaces section
3. Create new Space for image storage
4. Generate access keys in API section
5. Add credentials to `.env`

## Frontend: Using Auth

1. **Register or login** – `POST /api/auth/register` or `POST /api/auth/login` with `{ email, password }`. Response includes `data.token`.
2. **Send token on protected requests** – Add header: `Authorization: Bearer <your-token>`.
3. **Current user** – `GET /api/auth/me` with the same header returns the logged-in user.

Without a valid token, protected routes (create/update/delete story, upload image/pdf/audio, PDF parse) return 401.

## Support

For questions or issues:
1. Check the API health endpoint: `GET /api/health`
2. Review server logs for errors
3. Verify all environment variables are set
4. Test database and storage connections

## License

MIT License - see LICENSE file for details