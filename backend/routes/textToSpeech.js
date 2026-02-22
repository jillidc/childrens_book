const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { apiClient } = require('../lib/apiClient');
const { storageService } = require('../config/storage');

// Validation schema
const textToSpeechSchema = Joi.object({
  text: Joi.string().min(1).max(10000).required(),
  voiceId: Joi.string().optional().default('pNInz6obpgDQGcFmaJgB'), // Default: Adam voice
  modelId: Joi.string().optional().default('eleven_turbo_v2_5'),
  stability: Joi.number().min(0).max(1).optional().default(0.5),
  similarityBoost: Joi.number().min(0).max(1).optional().default(0.8),
  style: Joi.number().min(0).max(1).optional().default(0.2),
  useSpeakerBoost: Joi.boolean().optional().default(true),
  saveToStorage: Joi.boolean().optional().default(false)
});

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

const generateAudioWithElevenLabs = async (text, options = {}) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const {
    voiceId = 'pNInz6obpgDQGcFmaJgB',
    modelId = 'eleven_turbo_v2_5',
    stability = 0.5,
    similarityBoost = 0.8,
    style = 0.2,
    useSpeakerBoost = true
  } = options;

  const response = await apiClient.post(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    {
      text: String(text),
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
        use_speaker_boost: useSpeakerBoost
      }
    },
    {
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      responseType: 'arraybuffer',
      timeout: 60000
    }
  );

  return {
    audioData: response.data,
    contentType: 'audio/mpeg'
  };
};

// GET /api/text-to-speech/voices - Get available voices
router.get('/voices', async (req, res) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'ElevenLabs API key not configured'
      });
    }

    const response = await apiClient.get(`${ELEVENLABS_API_URL}/voices`, {
      headers: { 'xi-api-key': apiKey }
    });

    // Filter for child-friendly voices
    const childFriendlyVoices = response.data.voices.filter(voice => {
      const name = voice.name.toLowerCase();
      const description = voice.description?.toLowerCase() || '';
      return (
        name.includes('young') ||
        name.includes('child') ||
        description.includes('young') ||
        description.includes('child') ||
        voice.category === 'generated' // Often more suitable for children's content
      );
    });

    res.json({
      success: true,
      data: {
        recommended: childFriendlyVoices,
        all: response.data.voices,
        defaultVoice: 'pNInz6obpgDQGcFmaJgB' // Adam
      }
    });

  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available voices'
    });
  }
});

// POST /api/text-to-speech/generate - Generate audio from text
router.post('/generate', async (req, res) => {
  try {
    const { error, value } = textToSpeechSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { text, saveToStorage, ...options } = value;

    console.log(`Generating audio for text: ${text.substring(0, 100)}...`);

    const audioResult = await generateAudioWithElevenLabs(text, options);

    let audioUrl = null;
    if (saveToStorage && Buffer.isBuffer(audioResult.audioData)) {
      const uploadResult = await storageService.uploadAudio(
        audioResult.audioData,
        `tts-${Date.now()}.mp3`
      );
      audioUrl = uploadResult.url;
    }

    if (saveToStorage && audioUrl) {
      return res.json({
        success: true,
        data: {
          audioUrl,
          contentType: audioResult.contentType,
          size: audioResult.audioData.length
        },
        message: 'Audio generated and saved'
      });
    }

    res.set({
      'Content-Type': audioResult.contentType,
      'Content-Length': audioResult.audioData.length,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    });
    res.send(audioResult.audioData);
  } catch (error) {
    console.error('Error generating audio:', error);
    const message = error.response?.data
      ? (typeof error.response.data === 'string'
          ? error.response.data
          : error.response.data?.detail?.message || JSON.stringify(error.response.data))
      : error.message;
    res.status(500).json({
      success: false,
      error: 'Failed to generate audio. Please try again.',
      details: process.env.NODE_ENV === 'development' ? message : undefined
    });
  }
});

// POST /api/text-to-speech/stream - Stream audio generation (for longer texts)
router.post('/stream', async (req, res) => {
  try {
    const { error, value } = textToSpeechSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { text, saveToStorage, ...options } = value;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'ElevenLabs API key not configured'
      });
    }

    console.log(`Streaming audio for text: ${text.substring(0, 100)}...`);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });

    const axios = require('axios');
    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${options.voiceId}/stream`,
      {
        text: String(text),
        model_id: options.modelId,
        voice_settings: {
          stability: options.stability,
          similarity_boost: options.similarityBoost,
          style: options.style,
          use_speaker_boost: options.useSpeakerBoost
        }
      },
      {
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        responseType: 'stream'
      }
    );

    response.data.pipe(res);
  } catch (error) {
    console.error('Error streaming audio:', error);
    if (!res.headersSent) {
      const message = error.response?.data
        ? (typeof error.response.data === 'string'
            ? error.response.data
            : error.response.data?.detail?.message || JSON.stringify(error.response.data))
        : error.message;
      res.status(500).json({
        success: false,
        error: 'Failed to stream audio. Please try again.',
        details: process.env.NODE_ENV === 'development' ? message : undefined
      });
    }
  }
});

module.exports = router;