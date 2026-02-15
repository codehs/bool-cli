import fs from 'node:fs';
import path from 'node:path';
import ignore from 'ignore';
import { get, post } from '../utils/api.js';
import { success, error, info, table, json as printJson } from '../utils/output.js';

const DEFAULT_IGNORE = ['.git', 'node_modules', '__pycache__', '.DS_Store'];

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.mp3', '.mp4', '.wav', '.ogg', '.webm', '.avi', '.mov',
  '.pdf', '.zip', '.gz', '.tar', '.rar', '.7z',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.exe', '.dll', '.so', '.dylib',
  '.pyc', '.class', '.o',
]);

function isBinary(filePath) {
  return BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function loadIgnore(dir) {
  const ig = ignore().add(DEFAULT_IGNORE);
  const boolignore = path.join(dir, '.boolignore');
  if (fs.existsSync(boolignore)) {
    ig.add(fs.readFileSync(boolignore, 'utf-8'));
  }
  return ig;
}

function readDir(dir, ig, base = dir) {
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

export function register(program) {
  program
    .command('versions')
    .description('List version history')
    .argument('<slug>', 'Bool slug')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      try {
        const data = await get(`/bools/${slug}/versions/`);
        if (opts.json) return printJson(data);
        if (!data.length) return info('No versions found.');
        table(
          ['Version', 'Files', 'Message', 'Created'],
          data.map((v) => [
            `v${v.version_number}`,
            v.file_count,
            v.commit_message || '',
            v.created_at,
          ]),
        );
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });

  program
    .command('deploy')
    .description('Deploy local files as a new version')
    .argument('<slug>', 'Bool slug')
    .argument('[dir]', 'Directory to deploy', '.')
    .option('-m, --message <msg>', 'Commit message')
    .option('--exclude <pattern>', 'Exclude pattern (repeatable)', (val, prev) => [...prev, val], [])
    .option('--json', 'Output as JSON')
    .action(async (slug, dir, opts) => {
      const absDir = path.resolve(dir);
      if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
        error(`Not a directory: ${absDir}`);
        process.exit(1);
      }

      const ig = loadIgnore(absDir);
      if (opts.exclude.length) ig.add(opts.exclude);

      const files = readDir(absDir, ig);
      if (!files.length) {
        error('No files found to deploy.');
        process.exit(1);
      }

      info(`Deploying ${files.length} file(s) from ${absDir}…`);

      const body = { files };
      if (opts.message) body.commit_message = opts.message;

      try {
        const data = await post(`/bools/${slug}/versions/`, body);
        if (opts.json) return printJson(data);
        success(`Deployed v${data.version_number} (${data.file_count} files)`);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });

  program
    .command('pull')
    .description('Download files from a Bool')
    .argument('<slug>', 'Bool slug')
    .argument('[dir]', 'Output directory')
    .option('--version <n>', 'Version number (default: latest)')
    .option('--json', 'Output as JSON')
    .action(async (slug, dir, opts) => {
      const outDir = path.resolve(dir || slug);

      try {
        let url = `/bools/${slug}/files/`;
        if (opts.version) url += `?version_number=${opts.version}`;

        const data = await get(url);
        if (opts.json) return printJson(data);

        const files = data.files || [];
        if (!files.length) {
          info('No files to download.');
          return;
        }

        for (const f of files) {
          const filePath = path.join(outDir, f.filename);
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, f.code);
        }

        success(`Pulled ${files.length} file(s) to ${outDir} (v${data.version_number})`);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });
}
