// Gemini API service for story generation
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export const generateStory = async (description, language = 'english') => {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key not found. Please add REACT_APP_GEMINI_API_KEY to your .env file');
  }

  const prompt = `Create a magical, child-friendly story based on this drawing description: "${description}".

Requirements:
- Write the story in ${language}
- Make it approximately 200-300 words
- Include adventure, friendship, or wonder
- Use simple, engaging language suitable for children
- Make the story positive and uplifting
- Structure it with clear paragraphs
- Include the elements from the drawing description as main characters or important story elements

Please write only the story text, no additional formatting or explanations.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim();
    } else {
      throw new Error('Invalid response format from Gemini API');
    }
  } catch (error) {
    console.error('Error generating story:', error);

    // Fallback story for development/testing
    return `Once upon a time, there was a magical drawing that came to life! ${description} became the hero of an incredible adventure.

Through enchanted forests and over sparkling mountains, our brave character discovered that every line and color in the drawing held special powers. Along the way, they met friendly creatures who became the best of friends.

Together, they learned that imagination is the most powerful magic of all. Every stroke of creativity can build bridges between dreams and reality, creating stories that last forever.

And so, our drawing's adventure reminds us that art and imagination can take us anywhere we want to go, as long as we believe in the magic within ourselves.

The End.`;
  }
};