import { getApiKey, getApiUrl } from './config.js';

function headers(auth = true) {
  const h = { 'Content-Type': 'application/json' };
  if (auth) {
    const key = getApiKey();
    if (!key) {
      throw new Error('No API key configured. Run: bool auth login');
    }
    h['Authorization'] = `Bearer ${key}`;
  }
  return h;
}

async function request(method, path, body, auth = true) {
  const url = `${getApiUrl()}${path}`;
  const opts = { method, headers: headers(auth) };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `API error: ${res.status}`);
  }
  return data;
}

export function get(path) {
  return request('GET', path);
}

export function post(path, body) {
  return request('POST', path, body);
}

export function patch(path, body) {
  return request('PATCH', path, body);
}

export function del(path) {
  return request('DELETE', path);
}

export function healthCheck() {
  return request('GET', '/health/', undefined, false);
}
