import { createInterface } from 'node:readline';
import { exec } from 'node:child_process';
import { get, post, patch, del } from '../utils/api.js';
import { success, error, info, warn, table, json as printJson } from '../utils/output.js';
import { readProjectConfig, writeProjectConfig } from '../utils/config.js';

const VALID_VISIBILITIES = ['private', 'team', 'unlisted', 'public'];

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

function resolveSlug(slugArg) {
  if (slugArg) return slugArg;
  const projConfig = readProjectConfig(process.cwd());
  return projConfig.slug || null;
}

function requireSlug(slugArg) {
  const slug = resolveSlug(slugArg);
  if (!slug) {
    error('Provide a slug or run from a directory with a .bool/config file');
    process.exit(1);
  }
  return slug;
}

function parseLimit(limitValue) {
  const limit = parseInt(limitValue, 10);
  if (Number.isNaN(limit) || limit < 1) {
    error(`Invalid limit "${limitValue}". Must be a positive integer.`);
    process.exit(1);
  }
  return limit;
}

function validateVisibility(visibility) {
  if (!visibility) return;
  if (!VALID_VISIBILITIES.includes(visibility)) {
    error(`Invalid visibility "${visibility}". Must be one of: ${VALID_VISIBILITIES.join(', ')}`);
    process.exit(1);
  }
}

async function listBools(limitValue, asJson) {
  const limit = parseLimit(limitValue);
  const data = await get('/bools/');
  const items = data.slice(0, limit);

  if (asJson) return printJson(items);
  if (!items.length) return info('No Bools found.');

  table(
    ['Name', 'Slug', 'Visibility', 'URL', 'Updated'],
    items.map((b) => [b.name, b.slug, b.visibility, `https://${b.slug}.bool01.com`, b.updated_at]),
  );
}

async function createBool(name, asJson) {
  const data = await post('/bools/create/', { name });

  if (asJson) return printJson(data);
  success(`Created "${data.name}" (${data.slug})`);
  info(`URL: ${data.url}`);
}

async function showBool(slugArg, asJson) {
  const slug = requireSlug(slugArg);
  const data = await get(`/bools/${slug}/`);

  if (asJson) return printJson(data);

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

  const projConfig = readProjectConfig(process.cwd());
  if (!projConfig.slug || projConfig.slug === data.slug) {
    writeProjectConfig(process.cwd(), { slug: data.slug, name: data.name });
  }
}

async function updateBool(slugArg, fields, asJson) {
  const slug = requireSlug(slugArg);
  validateVisibility(fields.visibility);

  const body = {};
  if (fields.name) body.name = fields.name;
  if (fields.description) body.description = fields.description;
  if (fields.visibility) body.visibility = fields.visibility;

  if (!Object.keys(body).length) {
    error('Provide at least one of --name, --description, or --visibility');
    process.exit(1);
  }

  const data = await patch(`/bools/${slug}/`, body);

  if (asJson) return printJson(data);
  success(`Updated "${data.name}" (${data.slug})`);

  const projConfig = readProjectConfig(process.cwd());
  if (!projConfig.slug || projConfig.slug === slug) {
    writeProjectConfig(process.cwd(), { slug: data.slug, name: data.name });
  }
}

async function deleteBool(slugArg, yes) {
  const slug = requireSlug(slugArg);

  if (!yes) {
    const answer = await confirm(`Delete "${slug}"? This cannot be undone. (y/N) `);
    if (answer !== 'y') {
      info('Cancelled.');
      return;
    }
  }

  await del(`/bools/${slug}/`);
  success(`Deleted "${slug}".`);

  const projConfig = readProjectConfig(process.cwd());
  if (projConfig.slug === slug) {
    writeProjectConfig(process.cwd(), { slug: null, name: null });
  }
}

async function openBool(slugArg) {
  const slug = requireSlug(slugArg);
  const data = await get(`/bools/${slug}/`);
  info(`Opening ${data.url}…`);
  openUrl(data.url);
}

async function showOrSetVisibility(slugArg, setValue, asJson) {
  const slug = requireSlug(slugArg);

  if (setValue) {
    validateVisibility(setValue);
    const data = await patch(`/bools/${slug}/`, { visibility: setValue });
    if (asJson) return printJson(data);
    success(`Updated ${slug} visibility to ${setValue}`);
    return;
  }

  const data = await get(`/bools/${slug}/`);
  if (asJson) return printJson({ slug: data.slug, visibility: data.visibility });
  info(`Site: ${data.slug}`);
  info(`Visibility: ${data.visibility}`);
}

export function register(program) {
  program
    .command('list')
    .description('List Bools')
    .aliases(['ls'])
    .option('-l, --limit <n>', 'Number of Bools to show', '20')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        await listBools(opts.limit, opts.json);
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
        await createBool(name, opts.json);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });

  program
    .command('show')
    .description('Show Bool details and latest version')
    .aliases(['get', 'info'])
    .argument('[slug]', 'Bool slug (reads from .bool/config if omitted)')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      try {
        await showBool(slug, opts.json);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });

  program
    .command('update')
    .description('Update a Bool')
    .argument('[slug]', 'Bool slug (reads from .bool/config if omitted)')
    .option('--name <name>', 'New name')
    .option('--description <desc>', 'New description')
    .option('--visibility <vis>', `Visibility: ${VALID_VISIBILITIES.join('|')}`)
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      try {
        await updateBool(slug, opts, opts.json);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });

  program
    .command('delete')
    .description('Delete a Bool')
    .aliases(['rm'])
    .argument('[slug]', 'Bool slug (reads from .bool/config if omitted)')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (slug, opts) => {
      try {
        await deleteBool(slug, opts.yes);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });

  program
    .command('open')
    .description('Open Bool in browser')
    .argument('[slug]', 'Bool slug (reads from .bool/config if omitted)')
    .action(async (slug) => {
      try {
        await openBool(slug);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });
}
