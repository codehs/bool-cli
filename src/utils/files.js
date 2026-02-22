import fs from 'node:fs';
import path from 'node:path';
import ignore from 'ignore';

const DEFAULT_IGNORE = ['.git', 'node_modules', '__pycache__', '.DS_Store', '.bool'];

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.mp3', '.mp4', '.wav', '.ogg', '.webm', '.avi', '.mov',
  '.pdf', '.zip', '.gz', '.tar', '.rar', '.7z',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.exe', '.dll', '.so', '.dylib',
  '.pyc', '.class', '.o',
]);

export function isBinary(filePath) {
  return BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export function loadIgnore(dir) {
  const ig = ignore().add(DEFAULT_IGNORE);
  const boolignore = path.join(dir, '.boolignore');
  if (fs.existsSync(boolignore)) {
    ig.add(fs.readFileSync(boolignore, 'utf-8'));
  }
  return ig;
}

export function readDir(dir, ig, base = dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = path.relative(base, full);
    if (ig.ignores(rel)) continue;

    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files.push(...readDir(full, ig, base));
    } else if (stat.isFile() && !isBinary(full)) {
      files.push({ filename: rel, code: fs.readFileSync(full, 'utf-8') });
    }
  }
  return files;
}
