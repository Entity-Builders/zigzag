-- Seed: Hot Zones de Buenos Aires para dev
-- Ejecutar: psql $DATABASE_URL -f apps/zigzag/scripts/seed-hot-zones.sql
-- O desde Supabase Studio → SQL Editor

INSERT INTO active_zone (id, latitude, longitude, city, last_seen_at, request_count, "createdAt")
VALUES
  -- Palermo Soho (zona gastronómica + shopping)
  ('-34.588_-58.43', -34.588, -58.430, 'Buenos Aires - Palermo Soho', now(), 50, now()),
  -- Recoleta (museos + parques)
  ('-34.586_-58.394', -34.586, -58.394, 'Buenos Aires - Recoleta', now(), 35, now()),
  -- San Telmo (mercado + tango + bares)
  ('-34.622_-58.372', -34.622, -58.372, 'Buenos Aires - San Telmo', now(), 40, now()),
  -- Belgrano (residencial + Barrio Chino)
  ('-34.562_-58.456', -34.562, -58.456, 'Buenos Aires - Belgrano', now(), 20, now()),
  -- Puerto Madero (costanera + restaurantes)
  ('-34.614_-58.362', -34.614, -58.362, 'Buenos Aires - Puerto Madero', now(), 30, now()),
  -- Microcentro (oficinas + teatros)
  ('-34.604_-58.382', -34.604, -58.382, 'Buenos Aires - Microcentro', now(), 25, now())
ON CONFLICT (id) DO UPDATE SET
  last_seen_at = now(),
  request_count = GREATEST(active_zone.request_count, EXCLUDED.request_count);
