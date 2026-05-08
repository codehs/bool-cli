import fs from 'node:fs';
import path from 'node:path';
import { get, post } from '../utils/api.js';
import { loadIgnore, readDir } from '../utils/files.js';
import { success, info, warn, table, data as printData, listFooter } from '../utils/output.js';
import { readProjectConfig, writeProjectConfig } from '../utils/config.js';
import { uploadFiles } from '../utils/upload.js';
import { action, usage } from '../utils/action.js';

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
    .action(action(async (slugArg) => {
      const slug = slugArg || readProjectConfig(process.cwd()).slug;
      if (!slug) {
        usage('Slug required.', {
          hint: 'Pass <slug> or run from a directory with a .bool/config file.',
        });
      }

      const result = await get(`/bools/${slug}/versions/`);
      const shaped = printData(result);
      if (shaped === undefined) return;

      if (!result.length) return info('No versions found.');
      table(
        ['Version', 'Files', 'Message', 'Created'],
        result.map((v) => [`v${v.version_number}`, v.file_count, v.commit_message || '', v.created_at]),
      );
      listFooter(result.length, result.length, { hint: 'To narrow: add --select or --json.' });
    }));

  program
    .command('deploy')
    .description('Deploy local files as a new version (creates Bool if needed)')
    .argument('[slug]', 'Bool slug (reads from .bool/config if omitted)')
    .argument('[dir]', 'Directory to deploy (default: .)')
    .option('-m, --message <msg>', 'Commit message')
    .option('--exclude <pattern>', 'Exclude pattern (repeatable)', (val, prev) => [...prev, val], [])
    .option('--no-upload', 'Skip binary asset uploads')
    .option('--all-files', 'Upload all files, not just changed ones')
    .action(action(async (slugArg, dirArg, opts) => {
      const { slug: resolvedSlugArg, dir } = resolveSlugAndDir(slugArg, dirArg);
      const absDir = path.resolve(dir);
      if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
        usage(`Not a directory: ${absDir}`, { hint: 'Pass an existing directory path.' });
      }

      const projConfig = readProjectConfig(absDir);
      let slug = resolvedSlugArg || projConfig.slug;

      const ig = loadIgnore(absDir);
      if (opts.exclude.length) ig.add(opts.exclude);

      const files = readDir(absDir, ig);
      if (!files.length) {
        usage('No files found to deploy.', { hint: 'Check .boolignore and --exclude patterns.' });
      }

      if (opts.dryRun) {
        info(`[dry-run] Would deploy ${files.length} file(s) from ${absDir}` + (slug ? ` to ${slug}` : ' (new Bool)'));
        for (const f of files.slice(0, 20)) info(`  ${f.filename}`);
        if (files.length > 20) info(`  …and ${files.length - 20} more`);
        return;
      }

      // Create a new Bool if no slug exists
      if (!slug) {
        const boolName = projConfig.name || path.basename(absDir);
        info(`Creating new Bool "${boolName}"…`);
        const createData = await post('/bools/create/', { name: boolName });
        slug = createData.slug;
        success(`Created Bool "${createData.name}" (${slug})`);
      }

      info(`Deploying ${files.length} file(s) from ${absDir}…`);

      const body = { files };
      if (opts.message) body.commit_message = opts.message;

      const result = await post(`/bools/${slug}/versions/`, body);
      const liveUrl = `https://${slug}.bool01.com`;
      writeProjectConfig(absDir, { slug, ...(result.name ? { name: result.name } : {}) });

      const shaped = printData({ ...result, slug, url: liveUrl });
      if (shaped !== undefined) {
        success(`Deployed v${result.version_number} (${result.file_count} files)`);
        info(`Live URL: ${liveUrl}`);
      }

      // Upload binary/asset files (non-blocking)
      try {
        await uploadFiles(slug, absDir, { ig, skip: !opts.upload, allFiles: opts.allFiles });
      } catch (uploadErr) {
        warn(`File upload error: ${uploadErr.message}`);
      }
    }));

  program
    .command('pull')
    .description('Download files from a Bool')
    .argument('[slug]', 'Bool slug (reads from .bool/config if omitted)')
    .argument('[dir]', 'Output directory')
    .option('--version <n>', 'Version number (default: latest)')
    .action(action(async (slugArg, dirArg, opts) => {
      const { slug: resolvedSlugArg, dir } = resolveSlugAndDir(slugArg, dirArg);
      const projConfig = readProjectConfig(path.resolve(dir || '.'));
      const slug = resolvedSlugArg || projConfig.slug;
      if (!slug) {
        usage('Slug required.', {
          hint: 'Pass <slug> or run from a directory with a .bool/config file.',
        });
      }

      const outDir = path.resolve(dir || slug);

      let url = `/bools/${slug}/files/`;
      if (opts.version) url += `?version_number=${opts.version}`;

      const result = await get(url);
      const files = result.files || [];

      if (opts.dryRun) {
        info(`[dry-run] Would write ${files.length} file(s) to ${outDir}`);
        for (const f of files.slice(0, 20)) info(`  ${f.filename}`);
        if (files.length > 20) info(`  …and ${files.length - 20} more`);
        return;
      }

      if (!files.length) {
        const shaped = printData({ slug, version_number: result.version_number, file_count: 0, output_dir: outDir });
        if (shaped !== undefined) info('No files to download.');
        return;
      }

      for (const f of files) {
        const filePath = path.join(outDir, f.filename);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, f.code);
      }
      writeProjectConfig(outDir, { slug, ...(result.name ? { name: result.name } : {}) });

      const summary = {
        slug,
        version_number: result.version_number,
        file_count: files.length,
        output_dir: outDir,
        files: files.map((f) => f.filename),
      };
      const shaped = printData(summary);
      if (shaped !== undefined) {
        success(`Pulled ${files.length} file(s) to ${outDir} (v${result.version_number})`);
      }
    }));
}
