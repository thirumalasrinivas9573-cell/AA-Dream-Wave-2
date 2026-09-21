#!/bin/bash
# ══════════════════════════════════════════════════════
# DREAM WAVE AI — Start Both Servers
# Run: bash start.sh
# Optional: USE_MEMORY_MONGO=1 bash start.sh
# ══════════════════════════════════════════════════════

# Prefer a working Node binary (system /usr/local may be broken on older macOS)
for CANDIDATE in \
  "$HOME/node20/bin" \
  "$HOME/node18/bin" \
  "$HOME/node-v20.11.0-darwin-x64/bin" \
  "$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -1)/bin"
do
  if [ -x "$CANDIDATE/node" ]; then
    export PATH="$CANDIDATE:$PATH"
    break
  fi
done

echo ""
echo "🌊 Dream Wave AI — Starting servers..."
echo "   Node     → $(command -v node) ($(node -v 2>/dev/null))"
echo "   Backend  → http://127.0.0.1:5001"
echo "   Frontend → http://127.0.0.1:5173"
echo ""

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Start backend (memory Mongo fallback when local/Atlas DB is unavailable)
cd "$ROOT_DIR/server"
if [ "${USE_MEMORY_MONGO:-0}" = "1" ]; then
  node scripts/dev-memory-mongo.js &
else
  node server.js &
fi
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
sleep 3

# Start Next.js Enterprise client
cd "$ROOT_DIR/web"
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "══════════════════════════════════════════"
echo "  Backend  : http://127.0.0.1:5001"
echo "  Frontend : http://127.0.0.1:3000"
echo "  Memory Mongo: USE_MEMORY_MONGO=1 bash start.sh"
echo "  Press Ctrl+C to stop both servers"
echo "══════════════════════════════════════════"
echo ""

# Wait and clean up on Ctrl+C
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
