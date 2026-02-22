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
  return process.env.BOOL_API_URL || 'https://bool.com/api';
}

// Project-level config: <dir>/.bool/config
// Stores { slug, name } for the bool associated with a directory.

export function readProjectConfig(dir) {
  try {
    const configPath = path.join(dir, '.bool', 'config');
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeProjectConfig(dir, data) {
  const configDir = path.join(dir, '.bool');
  fs.mkdirSync(configDir, { recursive: true });
  const configPath = path.join(configDir, 'config');
  const existing = readProjectConfig(dir);
  const merged = { ...existing, ...data };
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2) + '\n');
}
