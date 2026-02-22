/**
 * Versioned prompt constants for Gemini / Imagen.
 * All prompts live here — no inline hardcoding in routes.
 *
 * Models (paid tier — $300 credits):
 *   Story gen / drawing parse / expansion : gemini-2.5-flash          (TEXT_MODEL / EXPANSION_MODEL)
 *   Image generation                      : imagen-4.0-generate-001   (IMAGE_MODEL — full quality)
 *
 * Version: 3.1.0
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
      "gender": "boy/girl/male/female/neutral — infer from the drawing; never leave ambiguous",
      "appearance": "3–4 visual details: gender, colors, clothing, hair/fur, distinguishing features (e.g. 'girl, brown pigtails, yellow dress, red shoes, freckles')"
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
- GENDER must be captured and written into appearance for every character. This is used to lock character gender across all generated images.
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
    const name   = c.name   || c;
    const gender = c.gender ? `${c.gender}, ` : '';
    const look   = c.appearance || '';
    // Explicitly prefix gender so image model never guesses or flips it
    return `Character ${i + 1}: "${name}" — ${gender}${look}`.trim();
  });
  return lines.join('. ') + '.';
}

/**
 * ILLUSTRATION_STYLE_BLOCK — woven into the narrative image prompt.
 *
 * gemini-2.5-flash-image (Nano Banana) understands natural language deeply.
 * Use a flowing description rather than comma-separated keywords.
 */
const ILLUSTRATION_STYLE_BLOCK =
  'The illustration is in a vibrant 2D flat children\'s picture book style — ' +
  'bold clean outlines, bright saturated colors, cute expressive characters with large friendly eyes, ' +
  'and a richly detailed storybook background. ' +
  'All character appearances (gender, hair, fur color, skin tone, clothing, species) must remain ' +
  'exactly consistent with how they are described — never change these between pages.';

/**
 * getSceneExpansionPrompt — STEP 1 before image generation.
 * Uses the text model to expand a short page sentence into a rich,
 * specific visual description that the image model can act on.
 * Includes previous-scene context so each image shows clear progression.
 *
 * @param {string} pageText          - The short story sentence(s) for this page
 * @param {string} previousSummary   - 1–2 sentence summary of the previous illustration
 * @param {string} characterDNA      - Character appearance block
 * @param {number} pageNum           - 1-based page index
 * @param {number} totalPages        - Total pages in the story
 */
function getSceneExpansionPrompt(pageText, previousSummary = '', characterDNA = '', pageNum = 1, totalPages = 1) {
  const isFirst = pageNum === 1;
  const isLast  = pageNum === totalPages;

  const stageNote = isFirst
    ? 'This is the OPENING scene — establish the world and introduce the main character warmly.'
    : isLast
    ? 'This is the FINAL scene — show resolution, joy, and a satisfying sense of completion.'
    : `Scene ${pageNum} of ${totalPages} — mid-story. Show clear visual progress from the previous scene.`;

  const progressionBlock = previousSummary
    ? `\nPrevious scene: "${previousSummary.slice(0, 250)}"\nIMPORTANT: The new scene must look VISIBLY DIFFERENT — change the location, time of day, weather, characters' positions/actions, or dominant colors. The reader must instantly see that the story has moved forward.`
    : '';

  return `You are a storyboard artist for a children's picture book. Write a concise visual brief that an illustrator can paint directly.

PAGE TEXT (must be illustrated accurately): "${pageText}"
${characterDNA ? `\nCharacters: ${characterDNA}` : ''}${progressionBlock}
${stageNote}

RULES:
1. The image MUST clearly show the specific event or action described in the page text above. Do not substitute or add a different event.
2. Never change any character's gender, species, hair/fur color, skin tone, or clothing from the descriptions above.
3. Keep the tone warm, bright, and child-friendly.

Write exactly 2 sentences:
- Sentence 1: What is happening in the foreground — the characters, their specific action from the page text, and their expressions.
- Sentence 2: The setting details — time of day, weather, background environment, dominant color palette, lighting mood, and one memorable visual detail (sparkles, falling leaves, lanterns, etc.).

Output ONLY the 2-sentence description. No headings, no labels.`;
}

/**
 * getPageIllustrationPrompt — STEP 2, image generation prompt.
 *
 * gemini-2.5-flash-image (Nano Banana) responds best to rich narrative paragraphs,
 * not keyword lists. Compose a single flowing description: scene first, then
 * character references woven in, then style context at the end.
 *
 * @param {string} expandedScene  - Visual brief from getSceneExpansionPrompt
 * @param {string} characterDNA   - Character appearance block from buildCharacterDNA
 * @param {number} pageNum        - 1-based page index
 * @param {number} totalPages     - Total pages
 */
function getPageIllustrationPrompt(expandedScene, characterDNA = '', pageNum = 1, totalPages = 1) {
  const scenePart = expandedScene.trim();

  const charPart = characterDNA
    ? `The characters in this scene: ${characterDNA}`
    : '';

  // Build a single narrative paragraph for Gemini's language model
  const parts = [scenePart];
  if (charPart) parts.push(charPart);
  parts.push(ILLUSTRATION_STYLE_BLOCK);

  return parts.join(' ');
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
2. Name every character in the scene and describe their appearance including gender, colors, clothing so the image generator draws them consistently across all pages.
3. Include setting details (indoor/outdoor, time of day, weather).
4. Child-friendly, warm, simple imagery. No dark or violent content.
5. NEVER change a character's gender, species, hair color, or clothing between scenes.

Respond with ONLY a JSON array of strings. No markdown.
Example: ["A small girl rabbit in a blue coat stands at the edge of a sunlit forest, looking curious.", "The same girl rabbit and a friendly male orange fox share red berries under a big oak tree at sunset."]`;

function getSceneIdentificationPrompt(simplifiedSection) {
  return `${SCENE_IDENTIFICATION}

Story section:
---
${simplifiedSection}
---`;
}

/**
 * BOOK_ILLUSTRATION_STYLE — style prefix for book-conversion illustrations.
 * Same visual voice as ILLUSTRATION_STYLE_PREFIX but for converted books.
 */
const BOOK_ILLUSTRATION_STYLE =
  'The illustration is in a vibrant 2D flat children\'s picture book style with bold clean outlines, ' +
  'bright saturated colors (bold primaries and warm pastels), and expressive characters with large friendly eyes. ' +
  'Rich storybook backgrounds with clear foreground, midground, and background layers. ' +
  'Warm magical atmosphere, crisp and clean, suitable for ages 4–8. ' +
  'Keep all character appearances exactly consistent across every scene — same gender, colors, and clothing.';

/**
 * getBookSceneIllustrationPrompt — image gen for one book scene.
 * Model: gemini-2.5-flash-image
 */
function getBookSceneIllustrationPrompt(sceneDescription, characterSummary = '') {
  const scenePart = sceneDescription.trim();
  const charPart  = characterSummary
    ? `The characters in this scene: ${characterSummary}`
    : '';
  const parts = [scenePart];
  if (charPart) parts.push(charPart);
  parts.push(BOOK_ILLUSTRATION_STYLE);
  return parts.join(' ');
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
  ILLUSTRATION_STYLE_BLOCK,
  ILLUSTRATION_STYLE_SUFFIX: ILLUSTRATION_STYLE_BLOCK, // backward-compat alias
  getSceneExpansionPrompt,
  getPageIllustrationPrompt,
  getSimplifyPrompt,
  SCENE_IDENTIFICATION,
  getSceneIdentificationPrompt,
  BOOK_ILLUSTRATION_STYLE,
  getBookSceneIllustrationPrompt,
  getExtractCharactersPrompt,
  getStoryFromDescriptionPrompt
};
