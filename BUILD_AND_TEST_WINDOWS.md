# Draw My Story — Build & Test on Windows 11

Complete steps to build and run the app on Windows 11 (PowerShell or Command Prompt).

---

## Prerequisites

1. **Node.js** (v18 or v20+ recommended)  
   - Download: https://nodejs.org/ (LTS)  
   - Check: `node -v` and `npm -v`

2. **Git** (optional, if cloning)  
   - You already have the repo; no need to install for build.

---

## 1. Clone or open the project

```powershell
cd C:\Users\chris\OneDrive\Documents\GitHub\childrens_book
```

---

## 2. Backend setup

### 2.1 Install dependencies

In PowerShell, run **two separate commands** (older PowerShell doesn’t support `&&`):

```powershell
cd backend
npm install
```

Then go back to the project root:

```powershell
cd ..
```

If you get script/execution errors, try:

```powershell
cd backend
npm install --legacy-peer-deps
cd ..
```

### 2.2 Create backend `.env`

**Option A — PowerShell (copy file):**

```powershell
Copy-Item backend\.env.example backend\.env
```

**Option B — Manual:**  
Copy `backend\.env.example` to `backend\.env` in File Explorer or your editor.

### 2.3 Edit `backend\.env`

**Minimum to run and test (no DB or storage):**

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Required for story and image generation
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Optional — read-aloud; omit to use browser fallback
ELEVENLABS_API_KEY=
```

**Optional (for full features):**

- **Snowflake** — Fill `SNOWFLAKE_*` if you want stories saved to the DB.  
- **DigitalOcean Spaces** — Fill `DO_SPACES_*` if you want generated images uploaded to cloud storage.  
- Without DO Spaces, generated images are returned as data URLs (works for testing).

**Get a Gemini API key:**

1. Open https://aistudio.google.com/  
2. Sign in, create or pick a project  
3. Get API key → paste into `GEMINI_API_KEY` in `backend\.env`

---

## 3. Frontend setup

### 3.1 Install dependencies

From the **project root** (not inside `backend`):

```powershell
npm install
```

### 3.2 Create frontend `.env`

**PowerShell:**

```powershell
Copy-Item .env.example .env
```

**Manual:** Copy `.env.example` to `.env` in the project root.

### 3.3 Edit `.env` (project root)

```env
REACT_APP_API_BASE_URL=http://localhost:5000/api
```

Leave this as-is for local testing.

---

## 4. Database (optional)

Only if you use Snowflake and filled `SNOWFLAKE_*` in `backend\.env`:

```powershell
cd backend
npm run init-db
cd ..
```

You can skip this and still test story generation; the app will fall back to localStorage when the DB is unavailable.

---

## 5. Build the frontend (production)

From the **project root**:

```powershell
npm run build
```

Output is in the `build` folder. Use this for production or static hosting.

---

## 6. Run and test locally

You need **two terminals** (two PowerShell or Command Prompt windows).

### Terminal 1 — Backend

```powershell
cd C:\Users\chris\OneDrive\Documents\GitHub\childrens_book\backend
npm run dev
```
(Use two separate lines; don’t use `&&` in PowerShell 5.)

Wait until you see something like:  
`Draw My Story API server running on port 5000`

### Terminal 2 — Frontend

```powershell
cd C:\Users\chris\OneDrive\Documents\GitHub\childrens_book
npm start
```
(Run from a **new** terminal so the backend keeps running in the first.)

The app should open in the browser at **http://localhost:3000**. If it doesn’t, open that URL manually.

---

## 7. Quick test checklist

| Step | What to do | Expected |
|------|------------|----------|
| Backend health | Open http://localhost:5000/api/health | JSON: `"status":"OK"` |
| Upload screen | Go to http://localhost:3000 | Upload area, description box, language, “Create My Story!” |
| Drawing → story | Upload any image, add a short description, click “Create My Story!” | Loading screen, then Story screen with pages and illustrations (or fallback story if API/key issue) |
| Read aloud | On Story screen, click “Read Story Aloud” | Audio plays (ElevenLabs if key set, else browser TTS) |
| Book conversion | Click “Convert a Book” (footer), paste a paragraph of text, click “Convert to children’s book” | Loading, then simplified text + illustrated scenes |
| Library | Click “My Library” | List of saved stories (or empty); “Read Story” opens a story |

---

## 8. Troubleshooting (Windows 11)

### Port already in use

If something else is using port 5000 or 3000:

- Backend: set `PORT=5001` (or another port) in `backend\.env`, then use `http://localhost:5001/api` in frontend `.env`:  
  `REACT_APP_API_BASE_URL=http://localhost:5001/api`
- Frontend: when you run `npm start`, you may be prompted to use another port (e.g. 3001); accept it.

### `npm install` fails (backend)

- Run PowerShell **as Administrator** and retry, or  
- Use: `npm install --legacy-peer-deps`  
- If you see errors about `sharp`, try: `npm install --ignore-scripts` then `npm install`.

### “Gemini API key not configured”

- Confirm `backend\.env` has `GEMINI_API_KEY=...` with no extra spaces or quotes.  
- Restart the backend after changing `.env` (`Ctrl+C`, then `npm run dev` again).

### CORS or “Failed to fetch”

- Backend must be running and reachable at the URL in `REACT_APP_API_BASE_URL`.  
- In `backend\.env`, `FRONTEND_URL` should be `http://localhost:3000` (or the port the frontend actually uses).

### Story shows “fallback” or no images

- Check backend logs for Gemini errors (e.g. rate limit, wrong model name).  
- Confirm your Gemini API key has access to the models used in the app (e.g. `gemini-2.5-flash`, `gemini-2.5-flash-image`).  
- Without DO Spaces, images can still appear as embedded data URLs.

---

## 9. Commands reference

| Task | Command (from project root unless noted) |
|------|----------------------------------------|
| Backend deps | `cd backend` then `npm install` (two separate commands in PowerShell) |
| Frontend deps | `npm install` |
| Backend dev | `cd backend` then `npm run dev` |
| Frontend dev | `npm start` |
| Frontend build | `npm run build` |
| Init DB (optional) | `cd backend` then `npm run init-db` |
| Backend tests | `cd backend` then `npm test` |
| Frontend tests | `npm test` |

**Note:** In Windows PowerShell 5, use separate commands instead of `&&`.

---

## 10. Project layout (reminder)

```
childrens_book/
├── .env                    ← Frontend env (REACT_APP_API_BASE_URL)
├── .env.example
├── package.json            ← Frontend
├── src/
│   ├── screens/            ← Upload, Loading, Story, Done, Library, BookConversion
│   └── services/           ← API / Gemini / story services
├── backend/
│   ├── .env                ← Backend env (GEMINI_API_KEY, etc.)
│   ├── .env.example
│   ├── package.json        ← Backend
│   ├── prompts.js          ← All Gemini prompts
│   ├── server.js
│   ├── routes/             ← generateStory, bookConversion, stories, upload, …
│   ├── services/           ← geminiClient
│   └── config/             ← storage, database
└── build/                  ← Created by npm run build
```

You’re on Windows 11; use the PowerShell or Command Prompt commands above as needed. Paths use your repo root; adjust the drive or path if your project lives elsewhere.
