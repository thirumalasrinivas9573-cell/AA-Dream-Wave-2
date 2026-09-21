# Run Guide

Follow these steps to run everything locally and verify with the Safe UI.

## Backend (Dream-Wave-AI)

```powershell
cd "dream-wave-ai/server"
npm install
node server.js
```

- Default port is `5000`. If busy, it will auto-fallback to `5001` and log a warning.
- Health: http://localhost:5000/health (or :5001 if fallback)
- Test:   http://localhost:5000/api/test (or :5001 if fallback)

## Frontend (Root React App)

```powershell
cd client
npm install
npm run dev
```

- Opens at http://localhost:5173
- Uses Vite proxy to forward `/api` to http://localhost:5000

## Safe UI (No build needed)

Open this file directly in your browser:

- safe-ui/index.html

Usage:
- Set the Base URL (defaults to `http://localhost:5000`)
- Click "Test Backend" → calls `/api/test`
- Click "Health Check" → calls `/health`

## Notes
- If you switched backend to :5001 via fallback, either update the Base URL in Safe UI or restart backend to free :5000.
- If MongoDB is not reachable, backend keeps running and logs a readable warning.
- To allow Safe UI (file://) requests, backend CORS now accepts `Origin: null`.
