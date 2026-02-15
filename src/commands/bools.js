import { createInterface } from 'node:readline';
import { exec } from 'node:child_process';
import { get, post, patch, del } from '../utils/api.js';
import { success, error, info, table, json as printJson } from '../utils/output.js';

function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function openUrl(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} ${url}`);
}

export function register(program) {
  program
    .command('list')
    .description('List Bools')
    .argument('[count]', 'Number of Bools to show', '5')
    .option('--json', 'Output as JSON')
    .action(async (count, opts) => {
      try {
        const limit = parseInt(count, 10);
        const data = await get('/bools/');
        const items = data.slice(0, limit);
        if (opts.json) return printJson(items);
        if (!items.length) return info('No Bools found.');
        table(
          ['Name', 'Slug', 'Visibility', 'Updated'],
          items.map((b) => [b.name, b.slug, b.visibility, b.updated_at]),
        );
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });

  program
    .command('create')
    .description('Create a new Bool')
    .argument('<name>', 'Bool name')
    .option('--json', 'Output as JSON')
    .action(async (name, opts) => {
      try {
        const data = await post('/bools/create/', { name });
        if (opts.json) return printJson(data);
        success(`Created "${data.name}" (${data.slug})`);
        info(`URL: ${data.url}`);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });

  program
    .command('info')
    .description('Show Bool details and latest version')
    .argument('<slug>', 'Bool slug')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      try {
        const data = await get(`/bools/${slug}/`);
        if (opts.json) return printJson(data);
        info(`Name: ${data.name}`);
        info(`Slug: ${data.slug}`);
        info(`Visibility: ${data.visibility}`);
        info(`Description: ${data.description || '(none)'}`);
        info(`URL: ${data.url}`);
        info(`Created: ${data.created_at}`);
        info(`Updated: ${data.updated_at}`);
        if (data.latest_version) {
          const v = data.latest_version;
          console.log();
          info(`Latest version: v${v.version_number}`);
          info(`  Files: ${v.file_count}`);
          info(`  Message: ${v.commit_message || '(none)'}`);
          info(`  Created: ${v.created_at}`);
        }
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });

  program
    .command('update')
    .description('Update a Bool')
    .argument('<slug>', 'Bool slug')
    .option('--name <name>', 'New name')
    .option('--description <desc>', 'New description')
    .option('--visibility <vis>', 'Visibility: private|team|unlisted|public')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const body = {};
      if (opts.name) body.name = opts.name;
      if (opts.description) body.description = opts.description;
      if (opts.visibility) body.visibility = opts.visibility;

      if (!Object.keys(body).length) {
        error('Provide at least one of --name, --description, or --visibility');
        process.exit(1);
      }

      try {
        const data = await patch(`/bools/${slug}/`, body);
        if (opts.json) return printJson(data);
        success(`Updated "${data.name}" (${data.slug})`);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });

  program
    .command('delete')
    .description('Delete a Bool')
    .argument('<slug>', 'Bool slug')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (slug, opts) => {
      if (!opts.yes) {
        const answer = await confirm(`Delete "${slug}"? This cannot be undone. (y/N) `);
        if (answer !== 'y') {
          info('Cancelled.');
          return;
        }
      }

      try {
        await del(`/bools/${slug}/`);
        success(`Deleted "${slug}".`);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });

  program
    .command('open')
    .description('Open Bool in browser')
    .argument('<slug>', 'Bool slug')
    .action(async (slug) => {
      try {
        const data = await get(`/bools/${slug}/`);
        const url = data.url;
        info(`Opening ${url}…`);
        openUrl(url);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });
}
