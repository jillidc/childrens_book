# Draw My Story - Setup Guide

Complete setup guide for the Draw My Story hackathon project.

## Project Structure

```
draw-my-story/
├── src/                    # React frontend
│   ├── screens/           # App screens (Upload, Loading, Story, etc.)
│   └── services/          # API services
├── backend/               # Node.js backend
│   ├── routes/           # API endpoints
│   ├── models/           # Database models
│   ├── config/           # Configuration files
│   └── scripts/          # Database initialization
└── public/               # Static assets
```

## Quick Start (Development)

### 1. Frontend Setup
```bash
# Install frontend dependencies
npm install

# Copy environment file
cp .env.example .env

# Start frontend development server
npm start
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 3. Configure Environment Variables

#### Backend (.env)
```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# API Keys (get these from respective services)
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

#### Frontend (.env)
```env
REACT_APP_API_BASE_URL=http://localhost:5000/api
```

### 4. Initialize Database
```bash
cd backend
npm run init-db
```

### 5. Start Both Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend (from project root)
npm start
```

## API Keys Setup

### Google Gemini API
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create project and generate API key
3. Add to backend `.env` as `GEMINI_API_KEY`

### ElevenLabs API
1. Sign up at [ElevenLabs](https://elevenlabs.io/)
2. Go to Profile & API Key section
3. Generate API key
4. Add to backend `.env` as `ELEVENLABS_API_KEY`

### Snowflake Database
1. Sign up for Snowflake account
2. Create database named `DRAW_MY_STORY`
3. Note account identifier, username, password
4. Add to backend `.env`

### DigitalOcean Spaces
1. Create DigitalOcean account
2. Create new Space for image storage
3. Generate access keys in API section
4. Add to backend `.env`

## Testing the Setup

### 1. Backend Health Check
Visit: http://localhost:5000/api/health

Expected response:
```json
{
  "status": "OK",
  "message": "Draw My Story API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Frontend Application
Visit: http://localhost:3000

You should see the Upload screen with:
- Image upload area
- Description text box
- Language selection
- Create Story button

### 3. Test Story Generation
1. Upload an image
2. Enter description: "A friendly dragon playing with butterflies"
3. Click "Create My Story!"
4. Should navigate to loading screen, then story screen

## Production Deployment

### Backend (DigitalOcean App Platform)
1. Connect GitHub repository
2. Choose `backend` folder as source
3. Set environment variables in dashboard
4. Deploy

### Frontend (Netlify/Vercel)
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `build`
4. Set environment variable: `REACT_APP_API_BASE_URL=https://your-backend-url/api`

## Troubleshooting

### Backend won't start
- Check all environment variables are set
- Verify database connection
- Check port 5000 is available

### Frontend API errors
- Verify `REACT_APP_API_BASE_URL` points to running backend
- Check browser console for CORS errors
- Ensure backend is running on correct port

### Story generation fails
- Verify Gemini API key is valid
- Check backend logs for API errors
- Test with fallback stories (should work without API key)

### Audio not working
- Verify ElevenLabs API key
- Check browser permissions for audio
- Test with browser speech synthesis fallback

### Image upload fails
- Verify DigitalOcean Spaces credentials
- Check file size (max 10MB)
- Ensure CORS is configured on Spaces

## Development Commands

### Frontend
```bash
npm start         # Development server
npm run build     # Production build
npm test          # Run tests
```

### Backend
```bash
npm run dev       # Development server with auto-reload
npm start         # Production server
npm run init-db   # Initialize database tables
npm test          # Run tests
```

## Architecture Overview

### Frontend (React)
- **Upload Screen**: Image upload + description input
- **Loading Screen**: Story generation progress
- **Story Screen**: Display story + text-to-speech
- **Library Screen**: View saved stories
- **Services**: API communication layer

### Backend (Node.js/Express)
- **Story Generation**: Gemini API integration
- **Text-to-Speech**: ElevenLabs API integration
- **Image Storage**: DigitalOcean Spaces
- **Database**: Snowflake for story persistence
- **Security**: CORS, rate limiting, validation

### Data Flow
1. User uploads image → Backend stores in DigitalOcean Spaces
2. User submits description → Backend calls Gemini API
3. Story generated → Saved to Snowflake database
4. User requests audio → Backend calls ElevenLabs API
5. Audio streamed to frontend for playback

This setup provides a robust, scalable foundation for the hackathon while maintaining fallback functionality for development.