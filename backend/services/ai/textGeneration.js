/**
 * Text generation service using Gemini 2.5 Flash.
 * Prompts are centralized here for prompt engineering.
 */

const { apiClient, ExternalApiError } = require('../../lib/apiClient');

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
];

function getStoryPrompt(description, language) {
  return `Create a magical, child-friendly story based on this drawing description: "${description}".

Requirements:
- Write the story in ${language}
- Make it approximately 200-300 words
- Include adventure, friendship, or wonder
- Use simple, engaging language suitable for children aged 4-10
- Make the story positive and uplifting
- Structure it with clear paragraphs
- Include the elements from the drawing description as main characters or important story elements
- Use vivid imagery that children can visualize
- Include a clear beginning, middle, and end
- End with a positive message or lesson

Please write only the story text, no additional formatting or explanations.`;
}

function getFallbackStory(description, language) {
  const stories = {
    english: `Once upon a time, there was a magical drawing that came to life! Your wonderful creation - ${description} - became the hero of an incredible adventure.

Through enchanted forests and over sparkling mountains, our brave character discovered that every line and color in the drawing held special powers. Along the way, they met friendly creatures who became the best of friends.

Together, they learned that imagination is the most powerful magic of all. Every stroke of creativity can build bridges between dreams and reality, creating stories that last forever.

And so, our drawing's adventure reminds us that art and imagination can take us anywhere we want to go, as long as we believe in the magic within ourselves.

The End.`,
    spanish: `Había una vez un dibujo mágico que cobró vida! Tu maravillosa creación - ${description} - se convirtió en el héroe de una aventura increíble.

A través de bosques encantados y sobre montañas brillantes, nuestro valiente personaje descubrió que cada línea y color en el dibujo tenía poderes especiales. En el camino, conocieron criaturas amigables que se convirtieron en los mejores amigos.

Juntos, aprendieron que la imaginación es la magia más poderosa de todas. Cada trazo de creatividad puede construir puentes entre los sueños y la realidad, creando historias que duran para siempre.

Y así, la aventura de nuestro dibujo nos recuerda que el arte y la imaginación pueden llevarnos a cualquier lugar que queramos ir, siempre que creamos en la magia dentro de nosotros mismos.

Fin.`,
    french: `Il était une fois un dessin magique qui a pris vie! Votre merveilleuse création - ${description} - est devenue le héros d'une aventure incroyable.

À travers des forêts enchantées et par-dessus des montagnes scintillantes, notre brave personnage a découvert que chaque ligne et couleur du dessin avait des pouvoirs spéciaux. En chemin, ils ont rencontré des créatures amicales qui sont devenues les meilleurs amis.

Ensemble, ils ont appris que l'imagination est la magie la plus puissante de toutes. Chaque trait de créativité peut construire des ponts entre les rêves et la réalité, créant des histoires qui durent éternellement.

Et ainsi, l'aventure de notre dessin nous rappelle que l'art et l'imagination peuvent nous emmener partout où nous voulons aller, tant que nous croyons en la magie en nous.

Fin.`,
    chinese: `从前，有一个神奇的画作活了过来！你的精彩创作——${description}——成为了一场不可思议冒险的英雄。

穿过魔法森林，越过闪闪发光的山脉，我们勇敢的角色发现画中的每一条线和每一种颜色都拥有特殊的力量。一路上，他们遇到了友善的生物，成为了最好的朋友。

他们一起学会了想象力是最强大的魔法。每一笔创意都能在梦想与现实之间架起桥梁，创造出永恒的故事。

因此，我们画作的冒险提醒我们，只要相信内心的魔法，艺术和想象力就能带我们去任何想去的地方。

完。`
  };
  return stories[language] || stories.english;
}

/**
 * Generate a children's story from a drawing description.
 * @param {string} description - Drawing description
 * @param {string} [language='english']
 * @param {Object} [options] - Optional overrides (e.g. custom prompt)
 * @returns {Promise<string>} Story text
 */
async function generateStory(description, language = 'english', options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const prompt = options.prompt ?? getStoryPrompt(description, language);

  try {
    const response = await apiClient.post(
      `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
          stopSequences: []
        },
        safetySettings: SAFETY_SETTINGS
      },
      { timeout: 30000 }
    );

    if (response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.data.candidates[0].content.parts[0].text.trim();
    }
    throw new Error('Invalid response format from Gemini API');
  } catch (error) {
    if (error instanceof ExternalApiError) {
      console.error('Gemini API Error:', error.message, error.status, error.data);
    } else {
      console.error('Gemini API Error:', error.message);
    }
    return getFallbackStory(description, language);
  }
}

module.exports = {
  generateStory,
  getFallbackStory,
  getStoryPrompt,
  GEMINI_MODEL
};
