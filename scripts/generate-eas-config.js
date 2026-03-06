#!/usr/bin/env node
/**
 * generate-eas-config.js
 *
 * Reads per-profile .env files and writes eas.json dynamically.
 * Run with: yarn eas:config (or node scripts/generate-eas-config.js)
 *
 * Profile → env file mapping:
 *   development           → .env.development
 *   development-simulator → .env.development.sim
 *   preview               → .env.preview
 *   production            → .env.production
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/** Parse a .env file into a key-value object. Returns {} if file doesn't exist. */
function parseEnvFile(filename) {
  const filepath = path.join(ROOT, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(
      `  ⚠️  ${filename} not found — skipping env vars for this profile.`,
    );
    return {};
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  const result = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    if (value !== '') {
      result[key] = value;
    }
  }

  return result;
}

/** Build the full eas.json structure */
function buildEasConfig() {
  const devEnv = parseEnvFile('.env.development');
  const devSimEnv = parseEnvFile('.env.development.sim');
  const previewEnv = parseEnvFile('.env.preview');
  const productionEnv = parseEnvFile('.env.production');

  return {
    cli: {
      version: '>= 7.0.0',
    },
    build: {
      development: {
        developmentClient: true,
        distribution: 'internal',
        channel: 'development',
        node: '22.12.0',
        env: devEnv,
      },
      'development-simulator': {
        developmentClient: true,
        distribution: 'internal',
        channel: 'development',
        node: '22.12.0',
        ios: {
          simulator: true,
        },
        env: devSimEnv,
      },
      preview: {
        distribution: 'internal',
        channel: 'preview',
        node: '22.12.0',
        env: previewEnv,
      },
      production: {
        channel: 'production',
        node: '22.12.0',
        env: productionEnv,
      },
    },
  };
}

// --- Main ---
console.log('🔧 Generating eas.json from .env files...\n');

const config = buildEasConfig();
const outputPath = path.join(ROOT, 'eas.json');
fs.writeFileSync(outputPath, JSON.stringify(config, null, 2) + '\n');

console.log(`\n✅ eas.json written to ${outputPath}`);
console.log('   Profiles generated:', Object.keys(config.build).join(', '));
