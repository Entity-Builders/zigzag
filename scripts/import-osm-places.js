#!/usr/bin/env node

/**
 * Import places from OpenStreetMap (Overpass API) into ZigZag's `place` table.
 *
 * Imports: subway stations, parks, museums, landmarks, markets from Buenos Aires.
 * Free, no API key needed.
 *
 * Usage: node scripts/import-osm-places.js
 */

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Buenos Aires bounding box (approx)
const BA_BBOX = '-34.71,-58.56,-34.52,-58.33';

// Queries for different place types
const QUERIES = [
  {
    type: 'subway_station',
    query: `[out:json][timeout:30];
      node["station"="subway"](${BA_BBOX});
      out body;`,
  },
  {
    type: 'train_station',
    query: `[out:json][timeout:30];
      node["railway"="station"]["station"!="subway"](${BA_BBOX});
      out body;`,
  },
  {
    type: 'park',
    query: `[out:json][timeout:30];
      (
        way["leisure"="park"]["name"](${BA_BBOX});
        relation["leisure"="park"]["name"](${BA_BBOX});
      );
      out center;`,
  },
  {
    type: 'museum',
    query: `[out:json][timeout:30];
      node["tourism"="museum"]["name"](${BA_BBOX});
      out body;`,
  },
  {
    type: 'landmark',
    query: `[out:json][timeout:30];
      node["historic"]["name"](${BA_BBOX});
      out body;`,
  },
  {
    type: 'market',
    query: `[out:json][timeout:30];
      node["shop"="supermarket"]["name"](${BA_BBOX});
      out body;`,
  },
  {
    type: 'theater',
    query: `[out:json][timeout:30];
      node["amenity"="theatre"]["name"](${BA_BBOX});
      out body;`,
  },
  {
    type: 'library',
    query: `[out:json][timeout:30];
      node["amenity"="library"]["name"](${BA_BBOX});
      out body;`,
  },
  {
    type: 'place_of_worship',
    query: `[out:json][timeout:30];
      node["amenity"="place_of_worship"]["name"]["tourism"](${BA_BBOX});
      out body;`,
  },
];

async function fetchOverpass(query) {
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  return data.elements || [];
}

function osmToPlace(element, type) {
  const tags = element.tags || {};
  const lat = element.lat || element.center?.lat;
  const lon = element.lon || element.center?.lon;

  if (!lat || !lon || !tags.name) return null;

  return {
    name: tags.name,
    type,
    description: tags.description || tags['description:es'] || null,
    latitude: lat,
    longitude: lon,
    address:
      [tags['addr:street'], tags['addr:housenumber']]
        .filter(Boolean)
        .join(' ') || null,
    city: tags['addr:city'] || 'Buenos Aires',
    country: 'Argentina',
    metadata: {
      osm_id: element.id,
      osm_type: element.type,
      ...(tags.website && { website: tags.website }),
      ...(tags.phone && { phone: tags.phone }),
      ...(tags.opening_hours && { opening_hours: tags.opening_hours }),
      ...(tags.wikidata && { wikidata: tags.wikidata }),
      ...(tags.wikipedia && { wikipedia: tags.wikipedia }),
      ...(tags['name:en'] && { name_en: tags['name:en'] }),
    },
  };
}

async function upsertPlaces(places) {
  // Use the service_role key to bypass RLS
  const response = await fetch(`${SUPABASE_URL}/rest/v1/place`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(places),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase insert error: ${response.status} - ${error}`);
  }

  return places.length;
}

async function main() {
  console.log('🗺️  ZigZag — Importing places from OpenStreetMap\n');

  // First, delete old seed data to avoid duplicates
  console.log('🧹 Cleaning old seeded data...');
  const delResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/place?city=eq.Buenos Aires`,
    {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    },
  );
  if (!delResponse.ok) {
    console.warn('⚠️  Could not clean old data, continuing anyway');
  }

  let totalImported = 0;

  for (const { type, query } of QUERIES) {
    try {
      process.stdout.write(`📡 Fetching ${type}... `);
      const elements = await fetchOverpass(query);

      const places = elements.map((el) => osmToPlace(el, type)).filter(Boolean);

      if (places.length === 0) {
        console.log('0 found, skipping');
        continue;
      }

      // Insert in batches of 50
      for (let i = 0; i < places.length; i += 50) {
        const batch = places.slice(i, i + 50);
        await upsertPlaces(batch);
      }

      console.log(`✅ ${places.length} imported`);
      totalImported += places.length;

      // Be nice to the Overpass API — wait between queries to avoid 429
      await new Promise((r) => setTimeout(r, 5000));
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
  }

  console.log(`\n🎉 Done! Total imported: ${totalImported} places`);

  // Quick verification
  const verifyResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/find_nearby_places`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        lat: -34.6037, // Obelisco
        lng: -58.3816,
        radius_meters: 2000,
      }),
    },
  );

  if (verifyResponse.ok) {
    const nearby = await verifyResponse.json();
    console.log(
      `\n📍 Verification — Places near Obelisco (2km): ${nearby.length}`,
    );
    nearby.slice(0, 5).forEach((p) => {
      console.log(
        `   ${p.type.padEnd(16)} ${p.name.substring(0, 40).padEnd(42)} ${Math.round(p.distance_meters)}m`,
      );
    });
  }
}

main().catch(console.error);
