#!/usr/bin/env node
/**
 * generate-eas-config.js
 *
 * Reads per-profile .env files and writes eas.json dynamically.
 * Run with: yarn eas:config (or node scripts/generate-eas-config.js)
 *
 * Profile → env file mapping:
 *   development           → .env.development       (tracked, device-specific IPs)
 *   development-simulator → .env.development.sim   (gitignored, localhost URLs)
 *   preview               → .env.preview            (tracked)
 *   production            → .env.production         (gitignored; created by CI from GitHub Secrets)
 *                           Locally: copy .env.production.template and fill in values
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
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    // Skip empty values — EAS will ignore them, no need to send noise
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
        env: devEnv,
      },
      'development-simulator': {
        developmentClient: true,
        ios: {
          simulator: true,
        },
        env: devSimEnv,
      },
      preview: {
        distribution: 'internal',
        channel: 'preview',
        env: previewEnv,
      },
      'preview-testflight': {
        distribution: 'store',
        autoIncrement: true,
        channel: 'preview',
        extends: 'preview',
      },
      production: {
        distribution: 'store',
        autoIncrement: true,
        channel: 'production',
        env: productionEnv,
      },
    },
    submit: {
      production: {},
      'preview-testflight': {
        ios: {
          appleId: 'juanobrach@gmail.com',
          ascAppId: 'YOUR_ASC_APP_ID',
          appleTeamId: 'C49352LA82',
        },
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
