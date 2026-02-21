// ElevenLabs API service for text-to-speech
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam voice, good for children's stories

export const playAudio = async (text, voiceId = DEFAULT_VOICE_ID) => {
  const apiKey = process.env.REACT_APP_ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ElevenLabs API key not found. Please add REACT_APP_ELEVENLABS_API_KEY to your .env file');
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    return audioUrl;
  } catch (error) {
    console.error('Error generating audio:', error);

    // For development, you could return a mock audio URL or use browser's speech synthesis
    return null;
  }
};

// Fallback function using browser's built-in speech synthesis (for development/testing)
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
        voice.gender === 'female'
      );

      if (childVoice) {
        utterance.voice = childVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      speechSynthesis.speak(utterance);
    } else {
      reject(new Error('Speech synthesis not supported'));
    }
  });
};