import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'bool-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

export function getApiKey() {
  return process.env.BOOL_API_KEY || readConfig().apiKey || null;
}

export function setApiKey(key) {
  const config = readConfig();
  config.apiKey = key;
  writeConfig(config);
}

export function getApiUrl() {
  return process.env.BOOL_API_URL || 'https://www.bool.dev/api';
}
