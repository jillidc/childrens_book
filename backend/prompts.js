/**
 * Versioned prompt constants for Gemini.
 * All prompts live here — no inline hardcoding in routes.
 *
 * Models:
 *   Text / Image-Parsing: gemini-2.5-flash  (TEXT_MODEL in geminiClient)
 *   Image Generation:     gemini-2.5-flash-image       (IMAGE_MODEL in geminiClient)
 *
 * Version: 2.0.0
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Feature 1: Drawing Imagination
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * DRAWING_PARSE_JSON — vision prompt
 * Input : child's drawing (image) + optional text description
 * Output: structured JSON for story + character-DNA extraction
 * Model : gemini-2.5-flash (multimodal)
 */
const DRAWING_PARSE_JSON = `You are analyzing a child's drawing. Describe what you see in a structured way so a story and matching illustrations can be generated.

Respond with ONLY valid JSON in this exact shape (no markdown, no extra text):
{
  "characters": [
    {
      "name": "short name or role (e.g. 'the blue cat', 'a small girl')",
      "appearance": "2–3 visual details: colors, clothing, features (e.g. 'blue fur, big green eyes, red scarf')"
    }
  ],
  "setting": "one short sentence describing where the scene takes place",
  "objects": ["notable object 1", "notable object 2"],
  "mood": "one word or short phrase (e.g. happy, adventurous, cozy)",
  "colors": ["dominant color 1", "dominant color 2", "dominant color 3"],
  "artStyle": "describe the child's drawing style in a few words (e.g. 'crayon, bright colors, simple shapes')",
  "childDescription": "if the user provided a text description, include it here verbatim; otherwise empty string"
}

Rules:
- Keep all descriptions short and child-friendly.
- If the image is unclear, make reasonable, positive assumptions.
- For each character, capture enough visual detail so an image generator can reproduce the character consistently across multiple scenes.
- If there are no clear characters, invent one friendly character that fits the drawing.`;

/**
 * getStoryFromJsonPrompt — text generation
 * Input : parsed drawing JSON (from DRAWING_PARSE_JSON)
 * Output: JSON array of page strings (max 10)
 * Model : gemini-2.5-flash
 */
function getStoryFromJsonPrompt(parsedJson, language = 'english') {
  return `You are a children's story writer. Using ONLY the following structured description of a child's drawing, write a short story for ages 4–8.

Parsed drawing description (JSON):
${typeof parsedJson === 'string' ? parsedJson : JSON.stringify(parsedJson, null, 2)}

Requirements:
- Write in ${language}. Use simple vocabulary suitable for Grade 2–3 reading level.
- Fun, whimsical tone. No dark, scary, or violent content.
- Story length: 5–10 pages. Each "page" is 1–3 short sentences that fit on one illustrated page.
- Reference the drawing's characters BY THE SAME NAME/DESCRIPTION given above. Do not invent major new characters or places.
- Clear beginning, middle, and end. End with a positive message or gentle lesson.
- Each page should describe a scene that can be illustrated (action, location, characters present).

Output format: respond with ONLY a JSON array of strings, one string per page. No markdown, no explanation.
Example: ["Page 1 text.", "Page 2 text.", ...]`;
}

/**
 * buildCharacterDNA — helper to create a reusable character block
 * from the parsed drawing JSON, threaded into every image prompt
 * so characters stay visually consistent across pages.
 */
function buildCharacterDNA(parsedJson) {
  const chars = parsedJson?.characters || [];
  if (chars.length === 0) return '';
  const lines = chars.map((c, i) => {
    const name = c.name || c;
    const look = c.appearance || '';
    return `Character ${i + 1}: "${name}" — ${look}`.trim();
  });
  return lines.join('. ') + '.';
}

/**
 * ILLUSTRATION_STYLE_PREFIX — prepended to EVERY page image prompt.
 * Anchors art style so the model doesn't drift between pages.
 */
const ILLUSTRATION_STYLE_PREFIX = [
  'Art style: child-friendly storybook illustration.',
  'Soft rounded shapes, warm color palette (yellows, oranges, soft greens, sky blues).',
  'Simple backgrounds, no photorealistic details.',
  'Gentle lighting, no harsh shadows.',
  'Characters have large expressive eyes, friendly expressions.',
  'No text, no UI elements, no dark or scary imagery.',
  'Consistent character design across all pages.'
].join(' ');

/**
 * getPageIllustrationPrompt — image generation prompt for one story page.
 * Includes the style prefix + character DNA + the specific scene.
 * Model: gemini-2.5-flash-image
 */
function getPageIllustrationPrompt(pageText, characterDNA = '', artStyleNote = '') {
  const parts = [ILLUSTRATION_STYLE_PREFIX];
  if (artStyleNote) parts.push(`Drawing style reference: ${artStyleNote}.`);
  if (characterDNA) parts.push(`Characters (keep consistent): ${characterDNA}`);
  parts.push(`Scene to illustrate: ${pageText}`);
  return parts.join('\n');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Feature 2: Book Conversion
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * getSimplifyPrompt — text simplification
 * Input : raw adult/YA text chunk
 * Output: simplified text (Grade 2–4)
 * Model : gemini-2.5-flash
 */
function getSimplifyPrompt(rawChunk) {
  return `Rewrite the following text for children aged 7–10 (Grade 2–4 reading level).

Rules:
- Use short sentences (≤ 12 words each when possible). No jargon or complex vocabulary.
- Preserve the core plot EXACTLY. Do NOT invent new events, characters, or story elements. Do NOT add moral lessons unless they were in the original.
- Keep the same tone (adventure, mystery, humor, etc.) but make it age-appropriate.
- If the text contains violence or mature themes, soften them (e.g. "the villain was angry" instead of graphic detail).
- Output ONLY the simplified text. No explanations, headings, or meta-commentary.

Original text:
---
${rawChunk}
---`;
}

/**
 * SCENE_IDENTIFICATION — identifies 2–4 key visual moments
 * Input : simplified story section
 * Output: JSON array of scene-description strings
 * Model : gemini-2.5-flash
 */
const SCENE_IDENTIFICATION = `You are an art director for a children's book. For the given story section, identify 2–4 key moments worth illustrating.

For each moment:
1. Write a short scene description (1–2 sentences) specific enough to send directly to an image generator.
2. Name every character in the scene and describe their appearance briefly so the image generator draws them consistently.
3. Include setting details (indoor/outdoor, time of day, weather).
4. Child-friendly, warm, simple imagery. No dark or violent content.

Respond with ONLY a JSON array of strings. No markdown.
Example: ["A small rabbit in a blue coat stands at the edge of a sunlit forest, looking curious.", "The rabbit and a friendly orange fox share red berries under a big oak tree at sunset."]`;

function getSceneIdentificationPrompt(simplifiedSection) {
  return `${SCENE_IDENTIFICATION}

Story section:
---
${simplifiedSection}
---`;
}

/**
 * BOOK_ILLUSTRATION_STYLE — style prefix for book-conversion illustrations.
 * Same block prepended to every scene so style stays locked.
 */
const BOOK_ILLUSTRATION_STYLE = [
  'Art style: consistent children\'s book illustration throughout.',
  'Warm palette (soft yellows, greens, sky blues, gentle oranges).',
  'Soft rounded shapes, simple and inviting.',
  'Characters have large eyes, friendly faces.',
  'Same visual style on every page — no style drift.',
  'No photorealistic, dark, or complex imagery. Ages 4–8.'
].join(' ');

/**
 * getBookSceneIllustrationPrompt — image gen for one book scene.
 * Model: gemini-2.5-flash-image
 */
function getBookSceneIllustrationPrompt(sceneDescription, characterSummary = '') {
  const parts = [BOOK_ILLUSTRATION_STYLE];
  if (characterSummary) parts.push(`Characters (keep consistent): ${characterSummary}`);
  parts.push(`Scene to illustrate: ${sceneDescription}`);
  return parts.join('\n');
}

/**
 * getExtractCharactersPrompt — extract character visual summaries from simplified text
 * so they can be threaded into every image prompt for consistency.
 * Model: gemini-2.5-flash
 */
function getExtractCharactersPrompt(simplifiedText) {
  return `Read the following children's story text and extract a list of every named character.

For each character, provide:
- name: the character's name or role
- appearance: 2–4 visual details (hair, clothing, colors, species, distinguishing features)

Respond with ONLY a JSON array. No markdown.
Example: [{"name":"Luna the rabbit","appearance":"small white rabbit, blue coat, red boots, pink nose"}]

Story text:
---
${simplifiedText}
---`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Legacy / description-only story (no drawing)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getStoryFromDescriptionPrompt(description, language = 'english') {
  return `Create a magical, child-friendly story based on this description: "${description}"

Requirements:
- Write the story in ${language}.
- 200–300 words total. For ages 4–8, Grade 2–3 reading level.
- Simple, engaging language. Themes of adventure, friendship, or wonder. Positive and uplifting.
- Clear beginning, middle, and end. Include the described elements as main characters.
- End with a positive message or lesson.
- Each page should describe a scene that can be illustrated.

Output: respond with ONLY a JSON array of 5–10 strings, one per page (1–3 sentences each). No markdown.
Example: ["Page 1 text.", "Page 2 text.", ...]`;
}

module.exports = {
  DRAWING_PARSE_JSON,
  getStoryFromJsonPrompt,
  buildCharacterDNA,
  ILLUSTRATION_STYLE_PREFIX,
  getPageIllustrationPrompt,
  getSimplifyPrompt,
  SCENE_IDENTIFICATION,
  getSceneIdentificationPrompt,
  BOOK_ILLUSTRATION_STYLE,
  getBookSceneIllustrationPrompt,
  getExtractCharactersPrompt,
  getStoryFromDescriptionPrompt
};
