#!/bin/zsh
# AA Dream Wave — Push to GitHub
# Usage: ./PUSH_TO_GITHUB.sh https://github.com/YOUR_USERNAME/aa-dream-wave.git

REPO_URL="${1:-}"

if [ -z "$REPO_URL" ]; then
  echo ""
  echo "Usage: ./PUSH_TO_GITHUB.sh https://github.com/YOUR_USERNAME/aa-dream-wave.git"
  echo ""
  echo "Step 1: Create a new repo at https://github.com/new"
  echo "Step 2: Run this script with the repo URL"
  exit 1
fi

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE_DIR"

echo ""
echo "🌊 AA Dream Wave — Pushing to GitHub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Repo: $REPO_URL"
echo ""

# Check if git is available
if ! command -v git &>/dev/null; then
  echo "❌ git not found. Install Xcode Command Line Tools:"
  echo "   xcode-select --install"
  exit 1
fi

# Init if needed
if [ ! -d ".git" ]; then
  git init
  echo "✅ Git initialized"
fi

# Set remote
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

# Stage everything (respects .gitignore)
git add -A
git status --short | head -20
echo ""

# Commit
git commit -m "AA Dream Wave — Production Build $(date '+%Y-%m-%d')" 2>/dev/null || \
git commit --allow-empty -m "AA Dream Wave — Deploy"

# Push
git branch -M main
git push -u origin main --force

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Pushed to GitHub!"
echo ""
echo "Next: Follow DEPLOY_NOW.md to deploy on Render + Netlify"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
