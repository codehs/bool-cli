import path from 'node:path';
import { post } from '../utils/api.js';
import { readProjectConfig, writeProjectConfig } from '../utils/config.js';
import { success, error, info, json as printJson } from '../utils/output.js';

function resolveSlugAndSecret(slugOrDir) {
  // If no argument, try current directory's .bool/config
  if (!slugOrDir) {
    const projConfig = readProjectConfig(process.cwd());
    if (!projConfig.slug) {
      error('Provide a slug or directory, or run from a directory with a .bool/config file');
      process.exit(1);
    }
    return { slug: projConfig.slug, secret: projConfig.secret || null, dir: process.cwd() };
  }

  // Check if it looks like a directory (has a .bool/config)
  const absDir = path.resolve(slugOrDir);
  const projConfig = readProjectConfig(absDir);
  if (projConfig.slug) {
    return { slug: projConfig.slug, secret: projConfig.secret || null, dir: absDir };
  }

  // Otherwise treat it as a slug directly (no secret available)
  return { slug: slugOrDir, secret: null, dir: null };
}

async function claimBool(slugOrDir, opts) {
  const { slug, secret, dir } = resolveSlugAndSecret(slugOrDir);

  const claimSecret = opts.secret || secret;
  if (!claimSecret) {
    error('No secret found. Provide --secret or run from a directory with a .bool/config that has a secret.');
    process.exit(1);
  }

  const data = await post(`/bools/${slug}/claim/`, { secret: claimSecret });

  if (opts.json) return printJson(data);

  success(`Claimed "${data.name}" (${data.slug})`);
  info(`URL: ${data.url}`);

  // Update project config if we resolved from a directory
  const configDir = dir || process.cwd();
  const projConfig = readProjectConfig(configDir);
  if (projConfig.slug === slug) {
    // Remove the secret since it's been cleared server-side
    writeProjectConfig(configDir, { slug: data.slug, name: data.name, secret: null });
  }
}

export function register(program) {
  program
    .command('claim')
    .description('Claim an anonymous Bool and transfer it to your account')
    .argument('[slug-or-directory]', 'Bool slug or directory with .bool/config (defaults to current directory)')
    .option('--secret <secret>', 'Bool secret (reads from .bool/config if omitted)')
    .option('--json', 'Output as JSON')
    .action(async (slugOrDir, opts) => {
      try {
        await claimBool(slugOrDir, opts);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });
}
