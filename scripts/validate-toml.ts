#!/usr/bin/env tsx
import { readFileSync } from 'fs';
import { parse } from '@iarna/toml';
import { resolve } from 'path';

const TOML_FILE = resolve(__dirname, '../write_from_url.toml');

try {
  const content = readFileSync(TOML_FILE, 'utf-8');
  parse(content);
  console.log('✅ TOML file is valid');
  process.exit(0);
} catch (error) {
  console.error('❌ TOML validation failed:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
