import fs from 'node:fs';
import path from 'node:path';
import { getApiKey, getApiUrl } from './config.js';
import { success, error as logError, info, warn } from './output.js';

const UPLOADABLE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.csv', '.xls', '.xlsx', '.doc', '.docx',
  '.txt', '.json', '.xml',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function scanUploadableFiles(dir, ig, base = dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = path.relative(base, full);
    if (ig.ignores(rel)) continue;

    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files.push(...scanUploadableFiles(full, ig, base));
    } else if (stat.isFile()) {
      const ext = path.extname(full).toLowerCase();
      if (UPLOADABLE_EXTENSIONS.has(ext)) {
        files.push({
          filename: rel,
          fullPath: full,
          size: stat.size,
          mtimeMs: stat.mtimeMs,
        });
      }
    }
  }
  return files;
}

function loadUploadState(dir) {
  try {
    const statePath = path.join(dir, '.bool', 'uploads.json');
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch {
    return {};
  }
}

function saveUploadState(dir, state) {
  const boolDir = path.join(dir, '.bool');
  fs.mkdirSync(boolDir, { recursive: true });
  fs.writeFileSync(path.join(boolDir, 'uploads.json'), JSON.stringify(state, null, 2) + '\n');
}

function filterChangedFiles(files, dir) {
  const state = loadUploadState(dir);
  return files.filter((f) => {
    const prev = state[f.filename];
    if (!prev) return true;
    return f.mtimeMs > prev.mtimeMs || f.size !== prev.size;
  });
}

async function uploadSingleFile(slug, file, apiKey) {
  const url = `${getApiUrl()}/bools/${slug}/upload/`;
  const fileContent = fs.readFileSync(file.fullPath);
  const blob = new Blob([fileContent]);

  const formData = new FormData();
  formData.append('file', blob, path.basename(file.fullPath));
  formData.append('filename', file.filename);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
    signal: AbortSignal.timeout(30_000),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

/**
 * Scan for and upload files after a deploy/shipit.
 * @param {string} slug - Bool slug
 * @param {string} dir - Absolute path to the project directory
 * @param {object} opts
 * @param {object} opts.ig - ignore instance (from loadIgnore)
 * @param {boolean} [opts.allFiles] - upload all files, not just changed
 * @param {boolean} [opts.skip] - skip uploads entirely
 */
export async function uploadFiles(slug, dir, opts = {}) {
  if (opts.skip) return;

  const apiKey = getApiKey();
  if (!apiKey) {
    if (opts.ig) {
      const files = scanUploadableFiles(dir, opts.ig);
      if (files.length) {
        warn('No API key configured — skipping file uploads. Create an API key at bool.com to enable uploads.');
      }
    }
    return;
  }

  if (!opts.ig) return;

  const allFiles = scanUploadableFiles(dir, opts.ig);
  if (!allFiles.length) return;

  const oversized = allFiles.filter((f) => f.size > MAX_FILE_SIZE);
  const validFiles = allFiles.filter((f) => f.size <= MAX_FILE_SIZE);

  const filesToUpload = opts.allFiles ? validFiles : filterChangedFiles(validFiles, dir);

  if (!filesToUpload.length) {
    if (oversized.length) {
      warn(`Skipped ${oversized.length} file(s) over 5MB: ${oversized.map((f) => f.filename).join(', ')}`);
    }
    return;
  }

  info(`Uploading ${filesToUpload.length} file(s)…`);

  const state = loadUploadState(dir);
  let uploaded = 0;
  let failed = 0;

  for (const file of filesToUpload) {
    try {
      const result = await uploadSingleFile(slug, file, apiKey);
      uploaded++;
      state[file.filename] = { mtimeMs: file.mtimeMs, size: file.size };
      const fileUrl = result.url || result.file_url || '';
      success(`  ${file.filename}${fileUrl ? ` → ${fileUrl}` : ''}`);
    } catch (err) {
      if (err.message.includes('already exists')) {
        state[file.filename] = { mtimeMs: file.mtimeMs, size: file.size };
        info(`  ${file.filename} (already uploaded)`);
        uploaded++;
      } else {
        failed++;
        let detail = err.message;
        if (err.message.includes('401')) detail = 'Invalid or expired API key';
        else if (err.message.includes('413') || err.message.toLowerCase().includes('too large')) detail = 'File too large (max 5MB)';
        else if (err.message.includes('415') || err.message.toLowerCase().includes('type')) detail = 'Unsupported file type';
        logError(`  ${file.filename}: ${detail}`);
      }
    }
  }

  saveUploadState(dir, state);

  const parts = [];
  if (uploaded > 0) parts.push(`${uploaded} uploaded`);
  if (failed > 0) parts.push(`${failed} failed`);
  if (parts.length) info(`File uploads: ${parts.join(', ')}`);

  if (oversized.length) {
    warn(`Skipped ${oversized.length} file(s) over 5MB: ${oversized.map((f) => f.filename).join(', ')}`);
  }

  if (failed > 0) {
    warn('Some uploads failed. Retry by redeploying, or check file types and sizes.');
  }
}
