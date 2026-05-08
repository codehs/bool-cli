import { createInterface } from 'node:readline';
import { exec } from 'node:child_process';
import { get, post, patch, del } from '../utils/api.js';
import { success, info, table, data as printData, listFooter } from '../utils/output.js';
import { readProjectConfig, writeProjectConfig } from '../utils/config.js';
import { action, usage } from '../utils/action.js';
import { CliError, EXIT } from '../utils/exit.js';

const VALID_VISIBILITIES = ['private', 'team', 'unlisted', 'public'];

function confirm(question, { noInput }) {
  if (noInput) {
    throw new CliError('Confirmation required but --no-input is set.', EXIT.USAGE, {
      hint: 'Pass --yes to skip the prompt.',
    });
  }
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

function resolveSlug(slugArg) {
  if (slugArg) return slugArg;
  return readProjectConfig(process.cwd()).slug || null;
}

function requireSlug(slugArg) {
  const slug = resolveSlug(slugArg);
  if (!slug) {
    usage('Slug required.', {
      hint: 'Pass <slug> or run from a directory with a .bool/config file.',
    });
  }
  return slug;
}

function parseLimit(limitValue) {
  const limit = parseInt(limitValue, 10);
  if (Number.isNaN(limit) || limit < 1) {
    usage(`Invalid --limit "${limitValue}".`, { hint: 'Must be a positive integer.' });
  }
  return limit;
}

function validateVisibility(visibility) {
  if (!visibility) return;
  if (!VALID_VISIBILITIES.includes(visibility)) {
    usage(`Invalid --visibility "${visibility}".`, {
      hint: `Must be one of: ${VALID_VISIBILITIES.join(', ')}`,
    });
  }
}

export function register(program) {
  program
    .command('list')
    .description('List Bools')
    .aliases(['ls'])
    .option('-l, --limit <n>', 'Number of Bools to show', '20')
    .action(action(async (opts) => {
      const limit = parseLimit(opts.limit);
      const all = await get('/bools/');
      const items = all.slice(0, limit);

      const shaped = printData(items);
      if (shaped === undefined) return; // structured output already emitted

      if (!items.length) return info('No Bools found.');

      table(
        ['Name', 'Slug', 'Visibility', 'URL', 'Updated'],
        items.map((b) => [b.name, b.slug, b.visibility, `https://${b.slug}.bool01.com`, b.updated_at]),
      );
      listFooter(items.length, all.length, { hint: 'To narrow: add --limit, --select, or --json.' });
    }));

  program
    .command('create')
    .description('Create a new Bool')
    .argument('<name>', 'Bool name')
    .action(action(async (name, opts) => {
      if (opts.dryRun) {
        info(`[dry-run] Would create Bool "${name}".`);
        return;
      }
      const result = await post('/bools/create/', { name });
      const shaped = printData(result);
      if (shaped === undefined) return;
      success(`Created "${result.name}" (${result.slug})`);
      info(`URL: ${result.url}`);
    }));

  program
    .command('show')
    .description('Show Bool details and latest version')
    .aliases(['get', 'info'])
    .argument('[slug]', 'Bool slug (reads from .bool/config if omitted)')
    .action(action(async (slug, opts) => {
      const resolved = requireSlug(slug);
      const result = await get(`/bools/${resolved}/`);

      const shaped = printData(result);
      if (shaped === undefined) {
        const projConfig = readProjectConfig(process.cwd());
        if (!projConfig.slug || projConfig.slug === result.slug) {
          writeProjectConfig(process.cwd(), { slug: result.slug, name: result.name });
        }
        return;
      }

      info(`Name: ${result.name}`);
      info(`Slug: ${result.slug}`);
      info(`Visibility: ${result.visibility}`);
      info(`Description: ${result.description || '(none)'}`);
      info(`URL: ${result.url}`);
      info(`Created: ${result.created_at}`);
      info(`Updated: ${result.updated_at}`);

      if (result.latest_version) {
        const v = result.latest_version;
        info(`Latest version: v${v.version_number}`);
        info(`  Files: ${v.file_count}`);
        info(`  Message: ${v.commit_message || '(none)'}`);
        info(`  Created: ${v.created_at}`);
      }

      const projConfig = readProjectConfig(process.cwd());
      if (!projConfig.slug || projConfig.slug === result.slug) {
        writeProjectConfig(process.cwd(), { slug: result.slug, name: result.name });
      }
    }));

  program
    .command('update')
    .description('Update a Bool')
    .argument('[slug]', 'Bool slug (reads from .bool/config if omitted)')
    .option('--name <name>', 'New name')
    .option('--description <desc>', 'New description')
    .option('--visibility <vis>', `Visibility: ${VALID_VISIBILITIES.join('|')}`)
    .action(action(async (slug, opts) => {
      const resolved = requireSlug(slug);
      validateVisibility(opts.visibility);

      const body = {};
      if (opts.name) body.name = opts.name;
      if (opts.description) body.description = opts.description;
      if (opts.visibility) body.visibility = opts.visibility;

      if (!Object.keys(body).length) {
        usage('No fields to update.', {
          hint: 'Provide at least one of --name, --description, or --visibility.',
        });
      }

      if (opts.dryRun) {
        info(`[dry-run] Would PATCH /bools/${resolved}/ with ${JSON.stringify(body)}`);
        return;
      }

      const result = await patch(`/bools/${resolved}/`, body);
      const shaped = printData(result);
      if (shaped === undefined) {
        const projConfig = readProjectConfig(process.cwd());
        if (!projConfig.slug || projConfig.slug === resolved) {
          writeProjectConfig(process.cwd(), { slug: result.slug, name: result.name });
        }
        return;
      }
      success(`Updated "${result.name}" (${result.slug})`);
      const projConfig = readProjectConfig(process.cwd());
      if (!projConfig.slug || projConfig.slug === resolved) {
        writeProjectConfig(process.cwd(), { slug: result.slug, name: result.name });
      }
    }));

  program
    .command('delete')
    .description('Delete a Bool')
    .aliases(['rm'])
    .argument('[slug]', 'Bool slug (reads from .bool/config if omitted)')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(action(async (slug, opts) => {
      const resolved = requireSlug(slug);

      if (opts.dryRun) {
        info(`[dry-run] Would delete "${resolved}".`);
        return;
      }

      if (!opts.yes) {
        const answer = await confirm(`Delete "${resolved}"? This cannot be undone. (y/N) `, {
          noInput: opts.input === false,
        });
        if (answer !== 'y') {
          info('Cancelled.');
          return;
        }
      }

      await del(`/bools/${resolved}/`);
      success(`Deleted "${resolved}".`);

      const projConfig = readProjectConfig(process.cwd());
      if (projConfig.slug === resolved) {
        writeProjectConfig(process.cwd(), { slug: null, name: null });
      }
    }));

  program
    .command('open')
    .description('Open Bool in browser')
    .argument('[slug]', 'Bool slug (reads from .bool/config if omitted)')
    .action(action(async (slug, opts) => {
      const resolved = requireSlug(slug);
      const result = await get(`/bools/${resolved}/`);
      if (opts.dryRun) {
        info(`[dry-run] Would open ${result.url}`);
        return;
      }
      info(`Opening ${result.url}…`);
      openUrl(result.url);
    }));
}
