#!/usr/bin/env bash
# MongoDB backup helper for Dream Wave AI
set -euo pipefail
URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/dreamwave}"
OUT_DIR="${1:-./backups}"
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$OUT_DIR"
mongodump --uri="$URI" --out="$OUT_DIR/dreamwave-$STAMP"
echo "Backup written to $OUT_DIR/dreamwave-$STAMP"
