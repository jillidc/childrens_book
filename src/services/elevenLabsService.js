import apiService from './apiService';

// Rachel — warm, calm, soothing female voice, perfect for children's storytelling
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
// eleven_flash_v2_5 — ultra-low latency model for fast playback start
const DEFAULT_MODEL_ID = 'eleven_flash_v2_5';

/**
 * Generate ElevenLabs audio with character-level timing for word highlighting.
 *
 * Returns:
 *   { audioUrl: string, wordTimings: Array<{word, charStart, charEnd, startTime, endTime}> }
 * or null on failure (caller should fall back to SpeechSynthesis).
 */
export const generateWithTimestamps = async (text, options = {}) => {
  try {
    const requestData = {
      text,
      voiceId:         options.voiceId         || DEFAULT_VOICE_ID,
      modelId:         options.modelId         || DEFAULT_MODEL_ID,
      stability:       options.stability        ?? 0.65,
      similarityBoost: options.similarityBoost  ?? 0.75,
      style:           options.style            ?? 0.3,
      useSpeakerBoost: options.useSpeakerBoost  ?? true,
      speed:           clampSpeed(options.speed ?? 1.0)
    };

    const response = await apiService.post('/text-to-speech/with-timestamps', requestData);

    if (!response.success || !response.audioBase64) {
      console.warn('ElevenLabs with-timestamps: unexpected response', response);
      return null;
    }

    // Decode base64 audio → Blob → object URL
    const byteChars  = atob(response.audioBase64);
    const byteArray  = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    const blob     = new Blob([byteArray], { type: response.mimeType || 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(blob);

    return {
      audioUrl,
      wordTimings: response.wordTimings || []
    };

  } catch (err) {
    console.error('ElevenLabs generateWithTimestamps failed:', err);
    return null;
  }
};

/** ElevenLabs speed range is 0.7–1.2 */
export const clampSpeed = (speed) => Math.min(1.2, Math.max(0.7, speed));

// ─── Legacy helpers kept for compatibility ────────────────────────────────────

export const playAudio = async (text, voiceId = DEFAULT_VOICE_ID) => {
  try {
    const audioBlob = await apiService.postBlob('/text-to-speech/generate', {
      text,
      voiceId,
      stability: 0.65,
      similarityBoost: 0.75,
      style: 0.3,
      useSpeakerBoost: true
    });
    return URL.createObjectURL(audioBlob);
  } catch (err) {
    console.error('playAudio failed, falling back to SpeechSynthesis:', err);
    return null;
  }
};

export const getAvailableVoices = async () => {
  try {
    const response = await apiService.get('/text-to-speech/voices');
    if (response.success) {
      return {
        recommended: response.data.recommended,
        all:         response.data.all,
        defaultVoice: response.data.defaultVoice
      };
    }
    throw new Error(response.error || 'Failed to fetch voices');
  } catch (err) {
    console.error('getAvailableVoices failed:', err);
    return { recommended: [], all: [], defaultVoice: DEFAULT_VOICE_ID };
  }
};

export const streamAudio = async (text, voiceId = DEFAULT_VOICE_ID) => {
  try {
    const audioBlob = await apiService.postBlob('/text-to-speech/stream', {
      text, voiceId, stability: 0.65, similarityBoost: 0.75, style: 0.3, useSpeakerBoost: true
    });
    return URL.createObjectURL(audioBlob);
  } catch (err) {
    console.error('streamAudio failed:', err);
    return playAudio(text, voiceId);
  }
};
