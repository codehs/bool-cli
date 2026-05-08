import fs from 'node:fs';
import path from 'node:path';
import { loadIgnore, readDir } from '../utils/files.js';
import { readProjectConfig, writeProjectConfig } from '../utils/config.js';
import { uploadFiles } from '../utils/upload.js';
import { success, info, data as printData } from '../utils/output.js';
import { action, usage } from '../utils/action.js';
import { CliError, EXIT } from '../utils/exit.js';

export function register(program) {
  program
    .command('shipit')
    .description('Create an anonymous Bool and upload local files in one step')
    .argument('[directory]', 'Directory to ship', '.')
    .option('--slug <slug>', 'Update an existing anonymous Bool instead of creating a new one')
    .option('--name <name>', 'Bool name (defaults to config, then directory name)')
    .option('-m, --message <msg>', 'Commit message (used when updating)')
    .option('--no-upload', 'Skip binary asset uploads')
    .option('--base-url <url>', 'Base URL (or set BOOL_BASE_URL)')
    .action(action(async (directory, opts) => {
      const absDir = path.resolve(directory);
      if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
        usage(`Not a directory: ${absDir}`, { hint: 'Pass an existing directory path.' });
      }

      const projConfig = readProjectConfig(absDir);
      const slug = opts.slug || projConfig.slug;
      const name = opts.name || projConfig.name || path.basename(absDir);

      const ig = loadIgnore(absDir);
      const files = readDir(absDir, ig);

      const baseUrl = (opts.baseUrl || process.env.BOOL_BASE_URL || 'https://bool.com').replace(/\/+$/, '');
      const isUpdate = Boolean(slug);

      if (isUpdate && !files.length) {
        usage('No files found to deploy.', { hint: 'Check .boolignore patterns.' });
      }

      if (opts.dryRun) {
        info(`[dry-run] Would ${isUpdate ? `update ${slug}` : `create new Bool "${name}"`} with ${files.length} file(s).`);
        return;
      }

      const secret = projConfig.secret || null;
      let url, body;
      if (isUpdate) {
        url = `${baseUrl}/api/bools/${slug}/versions-anonymous/`;
        body = { files };
        if (opts.message) body.commit_message = opts.message;
        if (secret) body.secret = secret;
      } else {
        url = `${baseUrl}/api/bools/create-anonymous/`;
        body = { name };
        if (files.length) body.files = files;
      }

      let res;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30_000),
        });
      } catch (err) {
        throw new CliError(`Network error: ${err.message}`, EXIT.API);
      }

      let result = null;
      try {
        result = await res.json();
      } catch {
        // ignore — handled below
      }

      if (!res.ok) {
        const msg = (result && result.error) || `API error: ${res.status} ${res.statusText}`.trim();
        const code = res.status === 404 ? EXIT.NOT_FOUND : res.status === 429 ? EXIT.RATE_LIMITED : EXIT.API;
        throw new CliError(msg, code);
      }

      const resultSlug = isUpdate ? slug : result.slug;
      const resultName = isUpdate ? (projConfig.name || name) : result.name;
      const liveUrl = `https://${resultSlug}.bool01.com`;

      const configData = { slug: resultSlug, name: resultName };
      if (!isUpdate && result.secret) configData.secret = result.secret;
      writeProjectConfig(absDir, configData);

      const summary = {
        slug: resultSlug,
        name: resultName,
        url: liveUrl,
        version_number: result.version_number,
        file_count: result.file_count ?? files.length,
        action: isUpdate ? 'updated' : 'created',
      };
      const shaped = printData(summary);
      if (shaped !== undefined) {
        if (isUpdate) {
          success(`Updated v${result.version_number} (${result.file_count} files)`);
        } else {
          success(`Shipped "${resultName}" (${files.length} files)`);
        }
        info(`Live URL: ${liveUrl}`);
        info(`slug: ${resultSlug}`);
      }

      try {
        await uploadFiles(resultSlug, absDir, { ig, skip: !opts.upload });
      } catch {
        // Upload failures should not block shipit
      }
    }));
}
