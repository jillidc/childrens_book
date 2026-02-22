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
 * ILLUSTRATION_STYLE_SUFFIX — appended AFTER the scene description in every image prompt.
 *
 * Imagen 4 best practice: lead with the scene/subject, then add style modifiers.
 * Keep total prompt under 480 tokens. This suffix is ~35 tokens.
 */
const ILLUSTRATION_STYLE_SUFFIX =
  'vibrant 2D flat children\'s picture book illustration, ' +
  'bright saturated colors, clean bold outlines, ' +
  'cute expressive characters with large friendly eyes, ' +
  'detailed storybook background, ' +
  'by a professional children\'s book illustrator, high quality, detailed';

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
    ? 'This is the OPENING scene. Establish the world and main character warmly and invitingly.'
    : isLast
    ? 'This is the FINAL scene. Show resolution, happiness, and a satisfying sense of completion.'
    : `This is scene ${pageNum} of ${totalPages} — mid-story. Show clear narrative progress.`;

  const progressionBlock = previousSummary
    ? `\nPrevious illustration summary: "${previousSummary}"\nCRITICAL: This new scene must look CLEARLY DIFFERENT from the previous one. Change: the location OR time of day OR weather OR the characters' positions/actions OR the color mood — ideally several of these at once. The reader must be able to tell the story has moved forward.`
    : '';

  return `You are a storyboard artist writing a visual brief for a children's picture-book illustrator.

Story page text: "${pageText}"
${characterDNA ? `Characters: ${characterDNA}` : ''}${progressionBlock}
${stageNote}

Write 2–3 sentences describing what to paint. Include:
- The main action and characters' expressions/poses in the foreground
- The setting: time of day, weather, indoor/outdoor, key colors and lighting mood
- One unique visual detail that makes this scene memorable (e.g. fireflies, falling snow, rainbow, etc.)
- Camera framing (wide shot / close-up / bird's-eye / low angle)

Be specific and vivid. Output ONLY the description — no labels or preamble.`;
}

/**
 * getPageIllustrationPrompt — STEP 2, image generation.
 *
 * Imagen 4 format: scene description FIRST, style modifiers AFTER.
 * Total prompt target: well under 480 tokens.
 *
 * @param {string} expandedScene  - Output of getSceneExpansionPrompt (2–3 sentences)
 * @param {string} characterDNA   - Character appearance block
 * @param {number} pageNum        - 1-based page index
 * @param {number} totalPages     - Total pages
 */
function getPageIllustrationPrompt(expandedScene, characterDNA = '', pageNum = 1, totalPages = 1) {
  const parts = [];

  // Scene first (Imagen best practice: subject/action leads the prompt)
  parts.push(expandedScene.trim());

  // Character reference (keep concise — DNA is already brief)
  if (characterDNA) {
    parts.push(`Characters: ${characterDNA}`);
  }

  // Style modifiers appended last
  parts.push(ILLUSTRATION_STYLE_SUFFIX);

  return parts.join('. ');
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
 * Same visual voice as ILLUSTRATION_STYLE_PREFIX but for converted books.
 */
const BOOK_ILLUSTRATION_STYLE = [
  '2D flat digital illustration, vibrant children\'s picture book style.',
  'Bright saturated colors, bold primaries and warm pastels.',
  'Clean outlines, flat color fills, soft rounded shapes.',
  'Characters have large friendly eyes and expressive faces.',
  'Rich storybook backgrounds, clear foreground/midground/background.',
  'Magical warm atmosphere, high contrast, crisp and clean.',
  'Ages 4–8 appropriate, no dark or complex imagery.'
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
  ILLUSTRATION_STYLE_SUFFIX,
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
