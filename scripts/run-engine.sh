#!/bin/bash
# ──────────────────────────────────────────────────
# run-engine.sh — Run ZigZag background engine locally
#
# Usage:
#   ./scripts/run-engine.sh           # Run once
#   ./scripts/run-engine.sh --loop    # Run every 10 minutes (Ctrl+C to stop)
#   ./scripts/run-engine.sh --loop 5  # Run every 5 minutes
# ──────────────────────────────────────────────────

set -euo pipefail

SUPABASE_URL="http://localhost:54321"
# Local anon key (safe to hardcode for dev)
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

run_engine() {
  local timestamp
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo "🚀 Engine Run — $timestamp"
  echo "═══════════════════════════════════════════════════"

  response=$(curl -s -w "\n%{http_code}" -X POST \
    "$SUPABASE_URL/functions/v1/zigzag-engine-orchestrator" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ANON_KEY" \
    -d '{}')

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -eq 200 ]; then
    echo "✅ Success (HTTP $http_code)"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
  else
    echo "❌ Error (HTTP $http_code)"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
  fi
}

# --- Main ---
if [ "${1:-}" = "--loop" ]; then
  INTERVAL="${2:-10}"
  echo "🔄 Engine loop mode — running every ${INTERVAL} minutes (Ctrl+C to stop)"
  
  while true; do
    run_engine
    echo ""
    echo "⏳ Next run in ${INTERVAL} minutes..."
    sleep $((INTERVAL * 60))
  done
else
  run_engine
fi
