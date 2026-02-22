import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { loadIgnore, readDir } from '../utils/files.js';

export function register(program) {
  program
    .command('shipit')
    .description('Create an anonymous Bool and upload local files in one step')
    .argument('[directory]', 'Directory to ship', '.')
    .option('--slug <slug>', 'Update an existing anonymous Bool instead of creating a new one')
    .option('--name <name>', 'Bool name (defaults to directory name)')
    .option('-m, --message <msg>', 'Commit message (used when updating)')
    .option('--base-url <url>', 'Base URL (or set BOOL_BASE_URL)')
    .action(async (directory, opts) => {
      const absDir = path.resolve(directory);
      if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
        process.stderr.write(chalk.red('✖') + ` Not a directory: ${absDir}\n`);
        process.exit(1);
      }

      const ig = loadIgnore(absDir);
      const files = readDir(absDir, ig);

      const baseUrl = (opts.baseUrl || process.env.BOOL_BASE_URL || 'https://bool.com')
        .replace(/\/+$/, '');

      const isUpdate = Boolean(opts.slug);

      if (isUpdate && !files.length) {
        process.stderr.write(chalk.red('✖') + ' No files found to deploy.\n');
        process.exit(1);
      }

      let url, body;
      if (isUpdate) {
        url = `${baseUrl}/api/bools/${opts.slug}/versions-anonymous/`;
        body = { files };
        if (opts.message) body.commit_message = opts.message;
      } else {
        url = `${baseUrl}/api/bools/create-anonymous/`;
        body = { name: opts.name || path.basename(absDir) };
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

        const slug = isUpdate ? opts.slug : data.slug;
        const liveUrl = `https://${slug}.bool01.com`;

        if (isUpdate) {
          process.stdout.write(liveUrl + '\n');
          process.stderr.write(chalk.green('✔') + ` Updated v${data.version_number} (${data.file_count} files)\n`);
          process.stderr.write(`  ${liveUrl}\n`);
          process.stderr.write(`  slug: ${slug}\n`);
        } else {
          process.stdout.write(liveUrl + '\n');
          process.stderr.write(chalk.green('✔') + ` Shipped "${data.name}" (${files.length} files)\n`);
          process.stderr.write(`  ${liveUrl}\n`);
          process.stderr.write(`  slug: ${slug}\n`);
        }
      } catch (err) {
        process.stderr.write(chalk.red('✖') + ` ${err.message}\n`);
        process.exit(1);
      }
    });
}
