#!/bin/zsh
# Dream Wave AI — Start All Servers
# Run: chmod +x START_ALL.sh && ./START_ALL.sh

export PATH="$HOME/node18/bin:$PATH"

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENT_DIR="$BASE_DIR/client"
SERVER_DIR="$BASE_DIR/server"

echo ""
echo "🌊 Dream Wave AI — Starting Servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Kill anything on these ports first
lsof -ti:5001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 1

# Start backend
echo "⚡ Starting Backend (port 5001)..."
cd "$SERVER_DIR"
node server.js &
SERVER_PID=$!
sleep 2

# Verify backend
if curl -s http://127.0.0.1:5001/health > /dev/null 2>&1; then
  echo "✅ Backend running → http://localhost:5001"
else
  echo "⚠️  Backend may still be starting..."
fi

# Start frontend
echo ""
echo "⚡ Starting Frontend (port 5173)..."
cd "$CLIENT_DIR"
node_modules/.bin/vite --port 5173 &
VITE_PID=$!
sleep 3

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Frontend → http://localhost:5173"
echo "✅ Backend  → http://localhost:5001"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Open browser
sleep 1
open "http://localhost:5173" 2>/dev/null || true

# Wait for both processes
wait $SERVER_PID $VITE_PID
