const express = require('express');
const router = express.Router();
const Joi = require('joi');
const axios = require('axios');

// Rachel — warm, calm, soothing female voice (ideal for children's storytelling)
const DEFAULT_VOICE_ID   = '21m00Tcm4TlvDq8ikWAM';
// eleven_v3 — most expressive model, ideal for storytelling and audiobook narration
const DEFAULT_MODEL_ID   = 'eleven_v3';

// Validation schema
const textToSpeechSchema = Joi.object({
  text: Joi.string().min(1).max(10000).required(),
  voiceId: Joi.string().optional().default(DEFAULT_VOICE_ID),
  modelId: Joi.string().optional().default(DEFAULT_MODEL_ID),
  stability: Joi.number().min(0).max(1).optional().default(0.5),
  similarityBoost: Joi.number().min(0).max(1).optional().default(0.75),
  style: Joi.number().min(0).max(1).optional().default(0.65),
  useSpeakerBoost: Joi.boolean().optional().default(true),
  speed: Joi.number().min(0.5).max(2.0).optional().default(1.0)
});

// ElevenLabs API configuration
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

const generateAudioWithElevenLabs = async (text, options = {}) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const {
    voiceId = DEFAULT_VOICE_ID,
    modelId = DEFAULT_MODEL_ID,
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.65,
    useSpeakerBoost = true,
    speed = 1.0
  } = options;

  try {
    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: useSpeakerBoost,
          speed
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        responseType: 'arraybuffer',
        timeout: 90000
      }
    );

    return {
      audioData: response.data,
      contentType: 'audio/mpeg'
    };

  } catch (error) {
    console.error('ElevenLabs API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data ? Buffer.from(error.response.data).toString() : 'No data',
      message: error.message
    });

    throw new Error('Failed to generate audio with ElevenLabs');
  }
};

/**
 * Inject ElevenLabs v3 audio tags at sentence boundaries for expressive narration.
 * Returns { annotated, offsets } where offsets maps clean→annotated positions.
 */
function addExpressiveMarkers(cleanText) {
  const markers = [];
  const sentenceRegex = /[^.!?]*[.!?]+/g;
  let m;
  let pos = 0;

  while ((m = sentenceRegex.exec(cleanText)) !== null) {
    const sentence = m[0];
    const lower = sentence.toLowerCase();
    let tag;

    if (/!/.test(sentence)) {
      if (/\b(hooray|yay|wow|amazing|wonderful|incredible|fantastic)\b/.test(lower)) {
        tag = '[laughs happily] ';
      } else {
        tag = '[excited] ';
      }
    } else if (/\?/.test(sentence)) {
      tag = '[curiously] ';
    } else if (/\b(whisper|quiet|soft|hush|tiptoe|sneak)\b/.test(lower)) {
      tag = '[softly] ';
    } else if (/\b(scar|dark|afraid|tremble|shiver|nervou)\b/.test(lower)) {
      tag = '[nervously] ';
    } else if (/\b(sad|cry|tear|miss|lone)\b/.test(lower)) {
      tag = '[gently] ';
    } else if (pos === 0) {
      tag = '[warmly] ';
    } else {
      tag = '';
    }

    if (tag) {
      markers.push({ cleanPos: m.index, marker: tag });
    }
    pos++;
  }

  let annotated = '';
  let lastCleanPos = 0;
  let cumOffset = 0;
  const offsets = [];

  for (const mk of markers) {
    annotated += cleanText.slice(lastCleanPos, mk.cleanPos) + mk.marker;
    cumOffset += mk.marker.length;
    offsets.push({ cleanPos: mk.cleanPos, offset: cumOffset });
    lastCleanPos = mk.cleanPos;
  }
  annotated += cleanText.slice(lastCleanPos);

  return { annotated, offsets };
}

function cleanToAnnotatedPos(cleanPos, offsets) {
  let offset = 0;
  for (const o of offsets) {
    if (o.cleanPos <= cleanPos) offset = o.offset;
    else break;
  }
  return cleanPos + offset;
}

/**
 * Convert character-level ElevenLabs alignment to word-level timing.
 * Word positions are in cleanText coordinates (for display highlighting).
 * Alignment is in annotatedText coordinates (what ElevenLabs received).
 */
const buildWordTimings = (cleanText, alignment, offsets = []) => {
  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment;
  if (!characters?.length) return [];
  const aLen = character_start_times_seconds.length;

  const wordTimings = [];
  const wordRegex = /\S+/g;
  let match;

  while ((match = wordRegex.exec(cleanText)) !== null) {
    const cleanStart = match.index;
    const cleanEnd   = cleanStart + match[0].length;

    const aStart = Math.min(cleanToAnnotatedPos(cleanStart, offsets), aLen - 1);
    const aEnd   = Math.min(cleanToAnnotatedPos(cleanEnd - 1, offsets), aLen - 1);

    wordTimings.push({
      word: match[0],
      charStart: cleanStart,
      charEnd: cleanEnd,
      startTime: character_start_times_seconds[aStart] ?? 0,
      endTime:   character_end_times_seconds[aEnd]   ?? 0
    });
  }

  return wordTimings;
};

// Generate audio WITH character-level timing for word highlighting
const generateAudioWithTimestamps = async (text, options = {}) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const {
    voiceId = DEFAULT_VOICE_ID,
    modelId = DEFAULT_MODEL_ID,
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.65,
    useSpeakerBoost = true,
    speed = 1.0
  } = options;

  const { annotated, offsets } = addExpressiveMarkers(text);
  console.log(`[TTS] Annotated text: "${annotated.slice(0, 120)}…"`);

  try {
    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/with-timestamps`,
      {
        text: annotated,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: useSpeakerBoost,
          speed
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        timeout: 90000
      }
    );

    const { audio_base64, alignment } = response.data;

    if (!audio_base64 || !alignment) {
      throw new Error('ElevenLabs returned incomplete timestamp response');
    }

    const wordTimings = buildWordTimings(text, alignment, offsets);

    return {
      audioBase64: audio_base64,
      mimeType: 'audio/mpeg',
      wordTimings
    };

  } catch (error) {
    console.error('ElevenLabs with-timestamps API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
        ? JSON.stringify(error.response.data).slice(0, 300)
        : 'No data',
      message: error.message
    });

    throw new Error('Failed to generate audio with timestamps from ElevenLabs');
  }
};

// POST /api/text-to-speech/with-timestamps - Generate audio + word-level timing for highlighting
router.post('/with-timestamps', async (req, res) => {
  try {
    const { error, value } = textToSpeechSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { text, ...options } = value;

    console.log(`Generating timestamped audio: "${text.substring(0, 80)}..."`);

    const result = await generateAudioWithTimestamps(text, options);

    return res.json({
      success: true,
      audioBase64: result.audioBase64,
      mimeType: result.mimeType,
      wordTimings: result.wordTimings
    });

  } catch (err) {
    console.error('Error in /with-timestamps:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate audio with timestamps.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

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

    const response = await axios.get(`${ELEVENLABS_API_URL}/voices`, {
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
        defaultVoice: DEFAULT_VOICE_ID
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

    const { text, ...options } = value;

    console.log(`Generating audio for text: ${text.substring(0, 100)}...`);

    const audioResult = await generateAudioWithElevenLabs(text, options);

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

    const { text, ...options } = value;
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