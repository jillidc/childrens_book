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

### 4. Start Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Health Check
- `GET /api/health` - Server status

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

### File Upload
- `POST /api/upload/image` - Upload single image
- `POST /api/upload/multiple` - Upload multiple images
- `DELETE /api/upload/:key` - Delete uploaded file
- `GET /api/upload/stats` - Storage statistics
- `GET /api/upload/images` - List uploaded images

### User Management
- `POST /api/users` - Create/find user
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/wallet/:address` - Get user by wallet address
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

### Upload Image
```bash
curl -X POST http://localhost:5000/api/upload/image \
  -F "image=@drawing.jpg" \
  -F "maxWidth=800" \
  -F "quality=90"
```

### Create Story
```bash
curl -X POST http://localhost:5000/api/stories \
  -H "Content-Type: application/json" \
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
  wallet_address VARCHAR(255) UNIQUE,
  username VARCHAR(100),
  email VARCHAR(255),
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
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Configuration

### Environment Variables
All sensitive configuration is handled through environment variables. See `.env.example` for required variables.

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

## Support

For questions or issues:
1. Check the API health endpoint: `GET /api/health`
2. Review server logs for errors
3. Verify all environment variables are set
4. Test database and storage connections

## License

MIT License - see LICENSE file for details