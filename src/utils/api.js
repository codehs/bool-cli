import { getApiKey, getApiUrl } from './config.js';
import { CliError, EXIT } from './exit.js';

function headers(auth = true) {
  const h = { 'Content-Type': 'application/json' };
  if (auth) {
    const key = getApiKey();
    if (!key) {
      throw new CliError('No API key configured.', EXIT.AUTH, {
        hint: 'Run: bool auth login (or export BOOL_API_KEY)',
      });
    }
    h['Authorization'] = `Bearer ${key}`;
  }
  return h;
}

function exitFromStatus(status) {
  if (status === 401 || status === 403) return EXIT.AUTH;
  if (status === 404) return EXIT.NOT_FOUND;
  if (status === 429) return EXIT.RATE_LIMITED;
  return EXIT.API;
}

async function request(method, path, body, auth = true) {
  const url = `${getApiUrl()}${path}`;
  const opts = { method, headers: headers(auth) };
  if (body !== undefined) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(url, opts);
  } catch (err) {
    throw new CliError(`Network error: ${err.message}`, EXIT.API);
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON body (e.g. HTML error page) — fall through to status-based message.
  }

  if (!res.ok) {
    const message = (data && data.error) || `API error: ${res.status} ${res.statusText}`.trim();
    throw new CliError(message, exitFromStatus(res.status));
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
