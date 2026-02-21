import apiService from './apiService';

// Story generation service using backend API
export const generateStory = async (description, language = 'english', translationLanguage = null) => {
  try {
    const requestData = {
      description,
      language,
      ...(translationLanguage && { translationLanguage })
    };

    const response = await apiService.post('/generate-story', requestData);

    if (response.success) {
      return response.data.story;
    } else {
      throw new Error(response.error || 'Failed to generate story');
    }
  } catch (error) {
    console.error('Error generating story:', error);

    // Fallback story for development/testing when backend is not available
    return getFallbackStory(description, language);
  }
};

// Fallback story generator for offline/development mode
const getFallbackStory = (description, language) => {
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
};