import fs from 'node:fs';
import path from 'node:path';
import { get, post } from '../utils/api.js';
import { loadIgnore, readDir } from '../utils/files.js';
import { success, error, info, warn, table, json as printJson } from '../utils/output.js';
import { readProjectConfig, writeProjectConfig } from '../utils/config.js';
import { uploadFiles } from '../utils/upload.js';

// If a single positional arg looks like a directory path, treat it as dir rather than slug.
function resolveSlugAndDir(slugArg, dirArg) {
  let slug = slugArg;
  let dir = dirArg || '.';

  if (slug && !dirArg) {
    const maybe = path.resolve(slug);
    if (fs.existsSync(maybe) && fs.statSync(maybe).isDirectory()) {
      dir = slug;
      slug = undefined;
    }
  }

  return { slug, dir };
}

export function register(program) {
  program
    .command('versions')
    .description('List version history')
    .argument('[slug]', 'Bool slug (reads from .bool/config if omitted)')
    .option('--json', 'Output as JSON')
    .action(async (slugArg, opts) => {
      const projConfig = readProjectConfig(process.cwd());
      const slug = slugArg || projConfig.slug;
      if (!slug) {
        error('Provide a slug or run from a directory with a .bool/config file');
        process.exit(1);
      }
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
    .argument('[slug]', 'Bool slug (reads from .bool/config if omitted)')
    .argument('[dir]', 'Directory to deploy (default: .)')
    .option('-m, --message <msg>', 'Commit message')
    .option('--exclude <pattern>', 'Exclude pattern (repeatable)', (val, prev) => [...prev, val], [])
    .option('--no-upload', 'Skip file uploads')
    .option('--all-files', 'Upload all files, not just changed ones')
    .option('--json', 'Output as JSON')
    .action(async (slugArg, dirArg, opts) => {
      const { slug: resolvedSlugArg, dir } = resolveSlugAndDir(slugArg, dirArg);

      const absDir = path.resolve(dir);
      if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
        error(`Not a directory: ${absDir}`);
        process.exit(1);
      }

      const projConfig = readProjectConfig(absDir);
      const slug = resolvedSlugArg || projConfig.slug;
      if (!slug) {
        error('Provide a slug or run from a directory with a .bool/config file');
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
        // Keep project config in sync
        writeProjectConfig(absDir, { slug, ...(data.name ? { name: data.name } : {}) });

        // Upload binary/asset files (non-blocking)
        try {
          await uploadFiles(slug, absDir, { ig, skip: !opts.upload, allFiles: opts.allFiles });
        } catch (uploadErr) {
          warn(`File upload error: ${uploadErr.message}`);
        }
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });

  program
    .command('pull')
    .description('Download files from a Bool')
    .argument('[slug]', 'Bool slug (reads from .bool/config if omitted)')
    .argument('[dir]', 'Output directory')
    .option('--version <n>', 'Version number (default: latest)')
    .option('--json', 'Output as JSON')
    .action(async (slugArg, dirArg, opts) => {
      const { slug: resolvedSlugArg, dir } = resolveSlugAndDir(slugArg, dirArg);

      const projConfig = readProjectConfig(path.resolve(dir || '.'));
      const slug = resolvedSlugArg || projConfig.slug;
      if (!slug) {
        error('Provide a slug or run from a directory with a .bool/config file');
        process.exit(1);
      }

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
        // Keep project config in sync with the pulled directory
        writeProjectConfig(outDir, { slug, ...(data.name ? { name: data.name } : {}) });
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });
}
