# Linking Vercel (Frontend) and Railway (Backend)

This project uses **Vercel** for the React frontend and **Railway** for the Node.js backend. They are linked by:

1. **Frontend** calling the backend via `REACT_APP_API_BASE_URL`
2. **Backend** allowing the frontend origin(s) via CORS (`FRONTEND_URL`)

---

## 1. Deploy the backend on Railway

1. Go to [railway.app](https://railway.app) and sign in (e.g. with GitHub).
2. **New Project** → **Deploy from GitHub repo** → select `jillidc/childrens_book` (or your fork).
3. Configure the service:
   - **Root directory**: set to `backend` (so Railway runs the Node app, not the React app).
   - **Build command**: `npm install` (or leave default if it installs deps).
   - **Start command**: `npm start` (or `node server.js`).
4. In the service **Variables** tab, add all variables from `backend/.env.example`. At minimum set:
   - `PORT` — Railway sets this automatically; you can leave it unset.
   - `NODE_ENV=production`
   - **`FRONTEND_URL`** — your Vercel frontend URL (see step 2 below).  
     Use a single URL, or a comma-separated list for production + preview, e.g.:  
     `FRONTEND_URL=https://your-app.vercel.app,https://your-app-abc123-team.vercel.app`
   - Plus: `JWT_SECRET`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, Snowflake, DigitalOcean Spaces, etc. (see `backend/.env.example`).
5. Deploy. Once it’s up, open the **Settings** tab and note the **Public URL** (e.g. `https://childrens-book-backend.up.railway.app`).  
   If there’s no public domain, click **Generate Domain** to get one.

Your backend API base is: **`https://<your-railway-app>.up.railway.app`**  
The frontend will call: **`https://<your-railway-app>.up.railway.app/api`**

---

## 2. Deploy the frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).
2. **Add New** → **Project** → import the same repo (`jillidc/childrens_book` or your fork).
3. Configure the frontend:
   - **Root Directory**: leave as repo root (so Vercel builds the React app).
   - **Framework Preset**: Create React App (or Vite if you use it).
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
4. In **Environment Variables**, add:
   - **`REACT_APP_API_BASE_URL`** = `https://<your-railway-app>.up.railway.app/api`  
     Use the exact Railway URL from step 1 (no trailing slash).  
     Example: `https://childrens-book-backend.up.railway.app/api`
5. Deploy. Note your Vercel URL (e.g. `https://your-app.vercel.app`).

---

## 3. Point the backend at the frontend (CORS)

Back on **Railway** → your backend service → **Variables**:

- Set **`FRONTEND_URL`** to your Vercel frontend URL, e.g.  
  `https://your-app.vercel.app`
- To allow **preview** deployments too, use a comma-separated list of allowed origins, for example:
  - `https://your-app.vercel.app,https://your-app-git-main-yourteam.vercel.app`
  - Or add each preview URL you use; the backend accepts multiple origins.

Save and redeploy the backend if you changed variables.

---

## 4. Quick checklist

| Where   | Variable                    | Value                                                                 |
|--------|-----------------------------|-----------------------------------------------------------------------|
| Vercel | `REACT_APP_API_BASE_URL`   | `https://<railway-app>.up.railway.app/api`                            |
| Railway| `FRONTEND_URL`             | `https://<vercel-app>.vercel.app` (or comma-separated list of origins)|

- Frontend (Vercel) and backend (Railway) must use **HTTPS** in production.
- After changing `REACT_APP_*` on Vercel, trigger a new deploy (builds bake in env vars).
- After changing `FRONTEND_URL` on Railway, redeploy the backend so CORS uses the new value.

---

## 5. Troubleshooting

**“Network error” or API calls fail from the Vercel site**

- Confirm `REACT_APP_API_BASE_URL` on Vercel is exactly your Railway URL + `/api`, with no typo or trailing slash issue.
- Redeploy the frontend after changing that variable (Create React App only reads `REACT_APP_*` at build time).

**CORS errors in the browser**

- Backend must allow the exact origin the browser sends (e.g. `https://your-app.vercel.app`). Check Railway `FRONTEND_URL`:
  - One origin: `https://your-app.vercel.app`
  - Multiple: `https://your-app.vercel.app,https://other-preview.vercel.app`
- Redeploy the backend after changing `FRONTEND_URL`.

**Backend 404 on `/api/...`**

- Ensure Railway is serving the Node app (root directory = `backend`, start command runs `server.js`).
- Health check: open `https://<railway-app>.up.railway.app/api/health` in a browser; you should see JSON.

**Auth (login/register) fails or cookies don’t work**

- Backend uses `credentials: true` for CORS. `FRONTEND_URL` must match the site origin exactly (scheme + host + port).
- If you use a custom domain on Vercel, set `FRONTEND_URL` to that domain (e.g. `https://app.yourdomain.com`).
