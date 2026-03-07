#!/bin/bash
# run-enrichment.sh — Simulates the cron job locally
# Usage: bash apps/zigzag/scripts/run-enrichment.sh
#
# Prerequisites:
#   - Supabase local running (docker-compose up in eb-infra)
#   - Edge functions running (yarn supabase:edge-functions)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
ANON_KEY="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU}"

echo "🌍 Step 1: Seeding hot zones..."
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f "$SCRIPT_DIR/seed-hot-zones.sql" 2>/dev/null && \
  echo "   ✅ Hot zones seeded" || \
  echo "   ⚠️  Seed skipped (might already exist)"

echo ""
echo "⚡ Step 2: Triggering enrichment engine..."
echo "   This will generate activities for each zone × moment..."
echo ""

RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/zigzag-enrichment-engine" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "📊 Result:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

echo ""
echo "🔍 Check activities in Supabase Studio: http://localhost:54323"
