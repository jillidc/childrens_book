# Draw My Story 🎨📚

**Team WICS Hackathon**: Jillian, Pravin, Christina, Anderson

Draw My Story is a magical children's story generation platform that transforms drawings and images into personalized stories using AI.

## 🎯 Project Goal

Our goal is to create an engaging platform where children's creativity comes to life through AI-powered storytelling, making reading interactive and personalized. For many young kids, reading can feel tedious, time-consuming, and lonely—especially for those whose parents are unable to read to them during bedtime. With Draw My Story, we seek to make reading not only fun, relatable, and engaging but also soothing, comforting, and exciting to anticipate each night.

For future extensions of our project, we seek to incorporate multiple languages so that:

1. Kids seeking to learn a second language can listen to and read along with the story narrator while having real-time access to a direct, native language translation of the foreign text that they are learning; we hope to have a translation in the kids' native tongue so that they can strengthen their foreign language comprehension by reinforcing translations between foreign and native tongues and building off of prior language knowledge.
2. Teens practicing for language exams can get customized content that is displayed in both their native language and foreign language of study. This would grant teens the opportunity to gain greater exposure to variety in the tonal inflections in the foreign language that they are studying.
We hope that our platform can support kids and teens who may not have regular access to native speakers (i.e. kids learning English in communities without many English speakers, teens studying Korean in communities with few Korean speakers beside their teachers at school during limited school hours, etc.).

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

## 📱 Platform Screens

1. **Upload** - Image upload, description input, language selection
2. **Loading** - Animated story generation progress
3. **Story** - Generated story display with audio playback
4. **Done** - Story completion with options to continue
5. **Library** - Collection of saved stories

## 🎯 Project Goal

Create an engaging platform where children's creativity comes to life through AI-powered storytelling, making reading interactive and personalized.

## 📄 License

MIT License - Built for WICS Hackathon 2024
