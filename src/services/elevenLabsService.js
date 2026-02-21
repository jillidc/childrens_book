import apiService from './apiService';

const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam voice, good for children's stories

// Text-to-speech service using backend API
export const playAudio = async (text, voiceId = DEFAULT_VOICE_ID) => {
  try {
    const requestData = {
      text: text,
      voiceId: voiceId,
      stability: 0.5,
      similarityBoost: 0.8,
      style: 0.2,
      useSpeakerBoost: true
    };

    // Get audio blob from backend
    const audioBlob = await apiService.postBlob('/text-to-speech/generate', requestData);

    // Create object URL for the audio blob
    const audioUrl = URL.createObjectURL(audioBlob);
    return audioUrl;
  } catch (error) {
    console.error('Error generating audio with backend:', error);

    // Fallback to browser's speech synthesis
    console.log('Falling back to browser speech synthesis...');
    return fallbackTextToSpeech(text);
  }
};

// Get available voices from backend
export const getAvailableVoices = async () => {
  try {
    const response = await apiService.get('/text-to-speech/voices');

    if (response.success) {
      return {
        recommended: response.data.recommended,
        all: response.data.all,
        defaultVoice: response.data.defaultVoice
      };
    } else {
      throw new Error(response.error || 'Failed to fetch voices');
    }
  } catch (error) {
    console.error('Error fetching voices:', error);
    return {
      recommended: [],
      all: [],
      defaultVoice: DEFAULT_VOICE_ID
    };
  }
};

// Fallback function using browser's built-in speech synthesis
export const fallbackTextToSpeech = (text) => {
  return new Promise((resolve, reject) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1.1;
      utterance.volume = 1;

      // Try to find a child-friendly voice
      const voices = speechSynthesis.getVoices();
      const childVoice = voices.find(voice =>
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('karen') ||
        voice.name.toLowerCase().includes('alex') ||
        voice.gender === 'female'
      );

      if (childVoice) {
        utterance.voice = childVoice;
      }

      // Create a mock audio URL that resolves when speech ends
      const mockAudio = {
        play: () => {
          speechSynthesis.speak(utterance);
          return Promise.resolve();
        },
        pause: () => speechSynthesis.pause(),
        onended: null,
        onerror: null
      };

      utterance.onend = () => {
        if (mockAudio.onended) mockAudio.onended();
        resolve(mockAudio);
      };

      utterance.onerror = (error) => {
        if (mockAudio.onerror) mockAudio.onerror();
        reject(error);
      };

      // Return the mock audio object that behaves like a URL
      resolve('speech-synthesis://mock-audio-url');
    } else {
      reject(new Error('Speech synthesis not supported'));
    }
  });
};

// Stream audio generation for longer texts
export const streamAudio = async (text, voiceId = DEFAULT_VOICE_ID) => {
  try {
    const requestData = {
      text: text,
      voiceId: voiceId,
      stability: 0.5,
      similarityBoost: 0.8,
      style: 0.2,
      useSpeakerBoost: true
    };

    // Use streaming endpoint for longer texts
    const audioBlob = await apiService.postBlob('/text-to-speech/stream', requestData);
    const audioUrl = URL.createObjectURL(audioBlob);
    return audioUrl;
  } catch (error) {
    console.error('Error streaming audio:', error);
    // Fallback to regular generation
    return playAudio(text, voiceId);
  }
};