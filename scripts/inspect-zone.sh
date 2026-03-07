#!/bin/bash
# ──────────────────────────────────────────────────
# inspect-zone.sh — Admin tool: inspect places + activities for a coordinate
#
# Usage:
#   ./scripts/inspect-zone.sh -34.5875 -58.4311
#   ./scripts/inspect-zone.sh -34.5875 -58.4311 3000   # custom radius in meters
# ──────────────────────────────────────────────────

set -euo pipefail

LAT="${1:?Usage: ./inspect-zone.sh <lat> <lng> [radius_meters]}"
LNG="${2:?Usage: ./inspect-zone.sh <lat> <lng> [radius_meters]}"
RADIUS="${3:-2000}"

DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"

echo ""
echo "═══════════════════════════════════════════════════"
echo "🔍 ZONE INSPECTOR — lat: $LAT, lng: $LNG, radius: ${RADIUS}m"
echo "═══════════════════════════════════════════════════"

# ─── Places ───
echo ""
echo "📍 PLACES (nearby, sorted by distance)"
echo "───────────────────────────────────────"
psql "$DB_URL" -x -c "
  SELECT 
    p.name,
    p.type,
    ROUND(ST_DistanceSphere(
      ST_MakePoint(p.longitude, p.latitude),
      ST_MakePoint($LNG, $LAT)
    )::numeric, 0) AS distance_m,
    p.address,
    p.metadata->>'localContext' AS local_context,
    p.metadata->>'source' AS source,
    p.id
  FROM place p
  WHERE ST_DistanceSphere(
    ST_MakePoint(p.longitude, p.latitude),
    ST_MakePoint($LNG, $LAT)
  ) <= $RADIUS
  ORDER BY distance_m ASC;
" 2>/dev/null || psql "$DB_URL" -c "
  SELECT 
    p.name,
    p.type,
    ROUND((
      6371000 * acos(
        cos(radians($LAT)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($LNG))
        + sin(radians($LAT)) * sin(radians(p.latitude))
      )
    )::numeric, 0) AS distance_m,
    p.address,
    p.metadata->>'localContext' AS local_context,
    p.metadata->>'source' AS source,
    LEFT(p.id::text, 8) AS id_short
  FROM place p
  WHERE (
    6371000 * acos(
      LEAST(1.0, cos(radians($LAT)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($LNG))
      + sin(radians($LAT)) * sin(radians(p.latitude)))
    )
  ) <= $RADIUS
  ORDER BY distance_m ASC;
"

# ─── Place counts by type ───
echo ""
echo "📊 PLACES BY TYPE"
echo "─────────────────"
psql "$DB_URL" -c "
  SELECT 
    p.type,
    COUNT(*) AS count
  FROM place p
  WHERE (
    6371000 * acos(
      LEAST(1.0, cos(radians($LAT)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($LNG))
      + sin(radians($LAT)) * sin(radians(p.latitude)))
    )
  ) <= $RADIUS
  GROUP BY p.type
  ORDER BY count DESC;
"

# ─── Activities ───
echo ""
echo "⚡ ACTIVITIES (ai_suggested, last 48h)"
echo "───────────────────────────────────────"
psql "$DB_URL" -c "
  SELECT 
    a.name,
    LEFT(a.description, 80) AS description,
    a.metadata->>'moment_of_day' AS moment,
    a.metadata->>'cache_key' AS cache_key,
    a.\"createdAt\"::date AS created,
    LEFT(a.id::text, 8) AS id_short
  FROM activity a
  WHERE a.type = 'ai_suggested'
    AND a.\"createdAt\" >= NOW() - INTERVAL '48 hours'
    AND (
      6371000 * acos(
        LEAST(1.0, cos(radians($LAT)) * cos(radians(a.latitude)) * cos(radians(a.longitude) - radians($LNG))
        + sin(radians($LAT)) * sin(radians(a.latitude)))
      )
    ) <= $RADIUS
  ORDER BY a.\"createdAt\" DESC;
"

# ─── Activity counts ───
echo ""
echo "📈 ACTIVITY STATS"
echo "─────────────────"
psql "$DB_URL" -c "
  SELECT 
    a.metadata->>'moment_of_day' AS moment,
    COUNT(*) AS count,
    MAX(a.\"createdAt\")::timestamp(0) AS latest
  FROM activity a
  WHERE a.type = 'ai_suggested'
    AND a.\"createdAt\" >= NOW() - INTERVAL '48 hours'
    AND (
      6371000 * acos(
        LEAST(1.0, cos(radians($LAT)) * cos(radians(a.latitude)) * cos(radians(a.longitude) - radians($LNG))
        + sin(radians($LAT)) * sin(radians(a.latitude)))
      )
    ) <= $RADIUS
  GROUP BY moment
  ORDER BY count DESC;
"

# ─── Scan cache ───
echo ""
echo "🗺️  SCAN CACHE"
echo "──────────────"
GRID_LAT=$(echo "scale=3; (($LAT * 500 + 0.5) / 1) / 500" | bc)
GRID_LNG=$(echo "scale=3; (($LNG * 500 + 0.5) / 1) / 500" | bc)
psql "$DB_URL" -c "
  SELECT 
    id,
    latitude,
    longitude,
    \"createdAt\"::timestamp(0) AS scanned_at,
    ROUND(EXTRACT(EPOCH FROM NOW() - \"createdAt\") / 3600)::int AS hours_ago
  FROM crawler_search
  WHERE ABS(latitude - $LAT) < 0.005
    AND ABS(longitude - $LNG) < 0.005;
"

echo ""
echo "✅ Done!"
