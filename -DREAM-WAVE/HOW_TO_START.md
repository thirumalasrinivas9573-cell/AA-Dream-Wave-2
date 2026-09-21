# 🌊 Dream Wave AI — Complete Setup & Deploy Guide

## Architecture
```
Frontend (React + Vite)  →  Netlify
Backend  (Node + Express) →  Render
Database (MongoDB)        →  MongoDB Atlas
AI       (OpenAI)         →  OpenAI API
```

---

## ──────────────────────────────────────────
## PART 1 — LOCAL DEVELOPMENT
## ──────────────────────────────────────────

### Step 1 — Backend Setup
```bash
cd server
cp .env.example .env       # fill in all values
npm install
npm run dev                # starts on http://localhost:5001
```

Test backend:
```
http://localhost:5001/health  → {"status":"OK"}
http://localhost:5001/api/test → {"success":true}
```

### Step 2 — Frontend Setup (new terminal)
```bash
cd client
npm install
# .env.local is NOT needed for local dev — Vite proxy handles /api automatically
npm run dev                # starts on http://localhost:5173
```

Open: http://localhost:5173

### How Local Connection Works
- Frontend at :5173 calls `/api/...`
- Vite proxy (vite.config.js) forwards `/api` → `http://localhost:5001`
- No CORS issues, no env vars needed for frontend locally

---

## ──────────────────────────────────────────
## PART 2 — PRODUCTION DEPLOY
## ──────────────────────────────────────────

### Step A — Deploy Backend to Render

1. Go to https://render.com → New → Web Service
2. Connect your GitHub repo
3. Set Root Directory: `server`
4. Build Command: `npm install`
5. Start Command: `node server.js`
6. Add Environment Variables:
   ```
   NODE_ENV        = production
   PORT            = 5001
   MONGODB_URL     = mongodb+srv://...your atlas url...
   JWT_SECRET      = your_long_random_secret
   OPENAI_API_KEY  = sk-proj-...
   CLIENT_URL      = https://YOUR-APP.netlify.app
   ```
7. Deploy → Copy the Render URL: `https://YOUR-APP.onrender.com`
8. Test: `https://YOUR-APP.onrender.com/health`

### Step B — Deploy Frontend to Netlify

1. Go to https://netlify.com → New site → Import from Git
2. Set Base directory: `client`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add Environment Variable:
   ```
   VITE_API_URL = https://YOUR-APP.onrender.com/api
   ```
6. Deploy Site → Copy URL: `https://YOUR-APP.netlify.app`

### Step C — Update Render with Netlify URL

1. Go back to Render → Your service → Environment
2. Update `CLIENT_URL` → `https://YOUR-APP.netlify.app`
3. Redeploy (or it auto-deploys)

### How Production Connection Works
```
Browser → https://YOUR-APP.netlify.app
  └─ React calls VITE_API_URL = https://YOUR-APP.onrender.com/api
       └─ Render backend responds
            └─ MongoDB Atlas
```

---

## ──────────────────────────────────────────
## PART 3 — MONGODB ATLAS SETUP
## ──────────────────────────────────────────

1. Go to https://cloud.mongodb.com
2. Create free cluster (M0)
3. Database Access → Add user (username + password)
4. Network Access → Add IP → 0.0.0.0/0 (allow all for Render)
5. Connect → Drivers → Copy connection string
6. Replace `<password>` with your password
7. Add `/dreamwave` before `?` for the DB name

Connection string format:
```
mongodb+srv://username:password@cluster.mongodb.net/dreamwave?retryWrites=true&w=majority
```

---

## ──────────────────────────────────────────
## PART 4 — TROUBLESHOOTING
## ──────────────────────────────────────────

| Problem | Fix |
|---------|-----|
| CORS error in browser | Set `CLIENT_URL` on Render to exact Netlify URL |
| 401 Unauthorized | JWT_SECRET mismatch between deploys |
| 404 on page refresh | netlify.toml `_redirects` rule handles this |
| AI calls timeout | Normal for free Render (cold start) — wait 30s |
| MongoDB connection fails | Check Atlas IP whitelist: 0.0.0.0/0 |
| Blank page on Netlify | Check `VITE_API_URL` env var is set |
| `npm run dev` fails | Run `npm install` in both `/server` and `/client` |

---

## ──────────────────────────────────────────
## PART 5 — QUICK COMMANDS
## ──────────────────────────────────────────

```bash
# Start everything locally (2 terminals)
cd server && npm run dev
cd client && npm run dev

# Build for production
cd client && npm run build

# Check server health
curl http://localhost:5001/health

# Check API works
curl http://localhost:5001/api/test
```

---

## ──────────────────────────────────────────
## PART 6 — ENV VARIABLES SUMMARY
## ──────────────────────────────────────────

### Render (Backend) — Required
| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5001` |
| `MONGODB_URL` | `mongodb+srv://...` |
| `JWT_SECRET` | 64-char random string |
| `OPENAI_API_KEY` | `sk-proj-...` |
| `CLIENT_URL` | `https://YOUR.netlify.app` |

### Netlify (Frontend) — Required
| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://YOUR.onrender.com/api` |

### Local Development
No env vars needed for frontend.
Only `/server/.env` is required.
