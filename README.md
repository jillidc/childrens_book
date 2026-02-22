# Draw My Story 🎨📚

**Team WICS Hackathon**: Jillian, Pravin, Christina, Anderson

A magical children's story generation app that transforms drawings into personalized stories using AI.

## ✨ Features

- **🎨 Draw & Upload**: Children can upload their drawings
- **📝 Story Generation**: AI creates personalized stories using Google Gemini
- **🔊 Text-to-Speech**: Stories read aloud with ElevenLabs voices
- **🌍 Multi-language**: Support for English, Spanish, French, Chinese
- **📚 Story Library**: Save and revisit created stories
- **📱 Cross-platform**: Web and iPad support (via Capacitor)

## 🚀 Quick Start

See [SETUP.md](./SETUP.md) for detailed setup instructions.

```bash
# Frontend
npm install && npm start

# Backend
cd backend && npm install && npm run dev
```

## 🏗️ Tech Stack

### Frontend
- **React** - UI framework
- **React Router** - Navigation
- **Capacitor** - Mobile app wrapper
- **CSS3** - Styling with child-friendly design

### Backend
- **Node.js + Express** - API server
- **Snowflake** - Cloud database
- **DigitalOcean Spaces** - Image storage
- **Google Gemini** - Story generation AI
- **ElevenLabs** - Text-to-speech

### Future Integration
- **Solana** - Blockchain authentication
- **iPad App** - Native mobile experience

## 📱 App Screens

1. **Upload** - Image upload, description input, language selection
2. **Loading** - Animated story generation progress
3. **Story** - Generated story display with audio playback
4. **Done** - Story completion with options to continue
5. **Library** - Collection of saved stories

## 🎯 Project Goal

Create an engaging platform where children's creativity comes to life through AI-powered storytelling, making reading interactive and personalized.

## 📄 License

MIT License - Built for WICS Hackathon 2024
