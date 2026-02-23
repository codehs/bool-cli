import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { loadIgnore, readDir } from '../utils/files.js';
import { readProjectConfig, writeProjectConfig } from '../utils/config.js';

export function register(program) {
  program
    .command('shipit')
    .description('Create an anonymous Bool and upload local files in one step')
    .argument('[directory]', 'Directory to ship', '.')
    .option('--slug <slug>', 'Update an existing anonymous Bool instead of creating a new one')
    .option('--name <name>', 'Bool name (defaults to config, then directory name)')
    .option('-m, --message <msg>', 'Commit message (used when updating)')
    .option('--base-url <url>', 'Base URL (or set BOOL_BASE_URL)')
    .action(async (directory, opts) => {
      const absDir = path.resolve(directory);
      if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
        process.stderr.write(chalk.red('✖') + ` Not a directory: ${absDir}\n`);
        process.exit(1);
      }

      // Load project-level config; CLI flags override config values
      const projConfig = readProjectConfig(absDir);
      const slug = opts.slug || projConfig.slug;
      const name = opts.name || projConfig.name || path.basename(absDir);

      const ig = loadIgnore(absDir);
      const files = readDir(absDir, ig);

      const baseUrl = (opts.baseUrl || process.env.BOOL_BASE_URL || 'https://bool.com')
        .replace(/\/+$/, '');

      const isUpdate = Boolean(slug);

      if (isUpdate && !files.length) {
        process.stderr.write(chalk.red('✖') + ' No files found to deploy.\n');
        process.exit(1);
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

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30_000),
        });

        const data = await res.json();

        if (!res.ok) {
          const msg = data.error || JSON.stringify(data);
          process.stderr.write(chalk.red('✖') + ` ${msg}\n`);
          process.exit(1);
        }

        const resultSlug = isUpdate ? slug : data.slug;
        const resultName = isUpdate ? (projConfig.name || name) : data.name;
        const liveUrl = `https://${resultSlug}.bool01.com`;

        // Write/update the project config so future runs reuse this bool
        const configData = { slug: resultSlug, name: resultName };
        if (!isUpdate && data.secret) configData.secret = data.secret;
        writeProjectConfig(absDir, configData);

        if (isUpdate) {
          process.stdout.write(liveUrl + '\n');
          process.stderr.write(chalk.green('✔') + ` Updated v${data.version_number} (${data.file_count} files)\n`);
          process.stderr.write(`  ${liveUrl}\n`);
          process.stderr.write(`  slug: ${resultSlug}\n`);
        } else {
          process.stdout.write(liveUrl + '\n');
          process.stderr.write(chalk.green('✔') + ` Shipped "${resultName}" (${files.length} files)\n`);
          process.stderr.write(`  ${liveUrl}\n`);
          process.stderr.write(`  slug: ${resultSlug}\n`);
        }
      } catch (err) {
        process.stderr.write(chalk.red('✖') + ` ${err.message}\n`);
        process.exit(1);
      }
    });
}
