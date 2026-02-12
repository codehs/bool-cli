// Stub API client — replace with real fetch calls when API is ready

import { getToken, getApiUrl } from './config.js';

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function get(path) {
  // TODO: return fetch(`${getApiUrl()}${path}`, { headers: headers() });
  return null;
}

export async function post(path, body) {
  // TODO: return fetch(`${getApiUrl()}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  return null;
}

export async function put(path, body) {
  // TODO: return fetch(`${getApiUrl()}${path}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
  return null;
}

export async function del(path) {
  // TODO: return fetch(`${getApiUrl()}${path}`, { method: 'DELETE', headers: headers() });
  return null;
}
