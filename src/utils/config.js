// Stub config helpers — replace with real implementation when API is ready

export function getToken() {
  return process.env.BOOL_TOKEN || null;
}

export function setToken(token) {
  // TODO: persist token to ~/.boolrc or similar
}

export function clearToken() {
  // TODO: remove persisted token
}

export function getApiUrl() {
  return process.env.BOOL_API_URL || 'https://api.bool.com';
}
