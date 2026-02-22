# Draw My Story 🎨📚

**Team WICS Hackathon**: Jillian, Pravin, Christina, Anderson

## 🎯 Project Goal

Draw My Story is a magical children's story generation app that transforms drawings and images into personalized stories using AI. 

Our goal is to create an engaging platform where children's creativity comes to life through AI-powered storytelling, making reading interactive and personalized. For many young kids, reading may be a tedious, time-consuming, and lonely task that they may pursue alone—especially for those whose parents are unable to read to them during bedtime. With Draw My Story, we seek to make reading not only fun, relatable, and engaging but also soothing and something to look forward to each night.

For future extensions of our project, we seek to incorporate multiple languages so that:

1. Kids seeking to learn a second language can listen to and read along with the story narrator. On the side of the page, we hope to have a translation in the kids' native tongue so that they can strengthen their foreign language comprehension by reinforcing translations between foreign and native tongues and building off of prior language knowledge.
3. Teens practicing for language exams can get customized content that is displayed in both their native language and foreign language of study. This would grant teens the opportunity to gain greater exposure to variety in the tonal inflections in the foreign language that they are studying.

We hope that our platform can enable kids and teens to study language with the support and access to verbal components of language that they may otherwise not receive as much exposure to.

## ✨ Features

- **🎨 Draw & Upload**: Children can upload their drawings
- **📝 Story Generation**: AI creates personalized stories using Google Gemini
- **🔊 Text-to-Speech**: Stories read aloud with ElevenLabs voices
- **📚 Story Library**: Save and revisit created stories

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

## 📄 License

MIT License - Built for WICS Hackathon 2024
