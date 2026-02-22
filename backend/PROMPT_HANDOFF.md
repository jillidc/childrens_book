# Prompt Handoff — Backend Team Reference

All prompts live in **`backend/prompts.js`** (version 2.0.0).

---

## Models

| Purpose | Model ID | File constant |
|---------|----------|---------------|
| Text generation / simplification / scene ID / image parsing | `gemini-2.5-flash` | `TEXT_MODEL` in `geminiClient.js` |
| Image generation (Nano Banana) | `gemini-2.5-flash-preview-image-generation` | `IMAGE_MODEL` in `geminiClient.js` |

> Both are preview models with tighter rate limits. The client retries up to 4× with exponential backoff on 429/503/RESOURCE_EXHAUSTED.

---

## Feature 1: Drawing Imagination

### Step 1 — Parse Drawing (vision)
- **Prompt:** `DRAWING_PARSE_JSON`
- **Model:** TEXT_MODEL (multimodal — image + text in)
- **Input:** child's drawing image (base64) + optional text description
- **Output:** JSON object:
  ```json
  {
    "characters": [{"name":"…","appearance":"…"}],
    "setting": "…",
    "objects": ["…"],
    "mood": "…",
    "colors": ["…"],
    "artStyle": "…",
    "childDescription": "…"
  }
  ```

### Step 2 — Generate Story
- **Prompt:** `getStoryFromJsonPrompt(parsedJson, language)` or `getStoryFromDescriptionPrompt(description, language)`
- **Model:** TEXT_MODEL
- **Input:** parsed JSON or plain description + language
- **Output:** JSON array of 5–10 page strings: `["Page 1 text.", "Page 2 text.", …]`

### Step 3 — Generate Page Illustrations
- **Prompt:** `getPageIllustrationPrompt(pageText, characterDNA, artStyleNote)`
- **Model:** IMAGE_MODEL
- **Input:** text prompt (includes style prefix + character DNA) + optional reference drawing (inlineData)
- **Output:** base64 PNG image

**Character consistency:** `buildCharacterDNA(parsedJson)` extracts character names+appearances from the parsed JSON. This string is prepended to every page image prompt so characters look the same across pages.

---

## Feature 2: Book Conversion

### Step 1 — Simplify Text
- **Prompt:** `getSimplifyPrompt(rawChunk)`
- **Model:** TEXT_MODEL
- **Input:** raw adult/YA text (chunked at 5000 chars if long)
- **Output:** simplified text (Grade 2–4, plain string)

### Step 2 — Extract Characters
- **Prompt:** `getExtractCharactersPrompt(simplifiedText)`
- **Model:** TEXT_MODEL
- **Input:** simplified story text
- **Output:** JSON array: `[{"name":"…","appearance":"…"}, …]`

### Step 3 — Identify Scenes
- **Prompt:** `getSceneIdentificationPrompt(simplifiedSection)`
- **Model:** TEXT_MODEL
- **Input:** simplified text section
- **Output:** JSON array of 2–4 scene description strings

### Step 4 — Generate Scene Illustrations
- **Prompt:** `getBookSceneIllustrationPrompt(sceneDescription, characterSummary)`
- **Model:** IMAGE_MODEL
- **Input:** text prompt (style prefix + character summary + scene)
- **Output:** base64 PNG image

**Character consistency:** Character summaries from Step 2 are threaded into every image prompt.

---

## Style Consistency Strategy

1. **Fixed style block** — `ILLUSTRATION_STYLE_PREFIX` (drawing) and `BOOK_ILLUSTRATION_STYLE` (book) are prepended to every image prompt verbatim.
2. **Character DNA** — character names + visual details extracted once, reused in every prompt.
3. **Reference image** — for Drawing Imagination, the child's original drawing is passed as `inlineData` alongside each page prompt.
4. **Sequential generation** — images are generated one at a time (not parallel) to reduce rate-limit pressure and improve consistency.
5. **Same model** — one image model per feature; never mix models within a story/book.

---

## Edge Cases

| Case | Handling |
|------|----------|
| Unclear/empty drawing | Vision prompt makes positive assumptions; fallback to description-only |
| Empty description | Joi rejects (min 1 char) |
| Text too long (book) | Chunked at 5000 chars, simplified sequentially |
| Rate limit (429) | Retry up to 4× with 2s→4s→8s→16s backoff |
| Image gen fails for one page | That page gets `imageUrl: null`; other pages still generated |
| Unsupported language | Joi rejects (only english/spanish/french/chinese) |
| Storage not configured | Falls back to data URLs for generated images |

---

## API Endpoints

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/generate-story` | POST | `{description, language, translationLanguage?, imageUrl?, imageBase64?}` | `{pages:[{text,imageUrl}], fullText, story, …}` |
| `/api/book-conversion` | POST | `{rawText}` | `{simplifiedText, scenes:[{index,description,imageUrl}], characterSummary}` |
| `/api/health` | GET | — | `{status:"OK"}` |
