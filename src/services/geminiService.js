import apiService from './apiService';

/**
 * Generate story via backend. Optional imageUrl (or data URL) for drawing-based story + illustrations.
 * Returns full response data: { pages, fullText, story, translatedStory, language, ... }.
 */
export const generateStory = async (
  description,
  language = 'english',
  translationLanguage = null,
  imageUrl = null
) => {
  try {
    const requestData = {
      description,
      language,
      ...(translationLanguage && { translationLanguage }),
      ...(imageUrl && { imageUrl })
    };

    const response = await apiService.post('/generate-story', requestData);

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to generate story');
  } catch (error) {
    console.error('Error generating story:', error);
    return getFallbackData(description, language);
  }
};

/** Book conversion: simplify text, extract scenes, generate illustrations. */
export const convertBook = async (rawText) => {
  try {
    const response = await apiService.post('/book-conversion', { rawText });
    if (response.success && response.data) return response.data;
    throw new Error(response.error || 'Book conversion failed');
  } catch (error) {
    console.error('Error converting book:', error);
    throw error;
  }
};

function getFallbackData(description, language) {
  const fullText = getFallbackStory(description, language);
  return {
    pages: [{ text: fullText, imageUrl: null }],
    fullText,
    story: fullText,
    translatedStory: null,
    translatedPages: null,
    language,
    translationLanguage: null,
    description,
    generatedAt: new Date().toISOString(),
    fallback: true
  };
}

function getFallbackStory(description, language) {
  const stories = {
    english: `Once upon a time, there was a magical drawing that came to life! Your wonderful creation - ${description} - became the hero of an incredible adventure. Through enchanted forests and over sparkling mountains, our brave character discovered that every line and color in the drawing held special powers. Together, they learned that imagination is the most powerful magic of all. The End.`,
    spanish: `Había una vez un dibujo mágico que cobró vida! Tu maravillosa creación - ${description} - se convirtió en el héroe de una aventura increíble. A través de bosques encantados, nuestro valiente personaje descubrió poderes especiales. Fin.`,
    french: `Il était une fois un dessin magique qui a pris vie! Votre merveilleuse création - ${description} - est devenue le héros d'une aventure incroyable. À travers des forêts enchantées, notre brave personnage a découvert des pouvoirs spéciaux. Fin.`,
    chinese: `从前，有一个神奇的画作活了过来！你的精彩创作——${description}——成为了一场不可思议冒险的英雄。穿过魔法森林，我们勇敢的角色发现了画中的特殊力量。完。`
  };
  return stories[language] || stories.english;
}
