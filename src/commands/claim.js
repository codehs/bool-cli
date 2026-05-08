import path from 'node:path';
import { post } from '../utils/api.js';
import { readProjectConfig, writeProjectConfig } from '../utils/config.js';
import { success, info, data as printData } from '../utils/output.js';
import { action, usage } from '../utils/action.js';

function resolveSlugAndSecret(slugOrDir) {
  if (!slugOrDir) {
    const projConfig = readProjectConfig(process.cwd());
    if (!projConfig.slug) {
      usage('Slug or directory required.', {
        hint: 'Pass <slug> or run from a directory with a .bool/config file.',
      });
    }
    return { slug: projConfig.slug, secret: projConfig.secret || null, dir: process.cwd() };
  }

  const absDir = path.resolve(slugOrDir);
  const projConfig = readProjectConfig(absDir);
  if (projConfig.slug) {
    return { slug: projConfig.slug, secret: projConfig.secret || null, dir: absDir };
  }

  return { slug: slugOrDir, secret: null, dir: null };
}

export function register(program) {
  program
    .command('claim')
    .description('Claim an anonymous Bool and transfer it to your account')
    .argument('[slug-or-directory]', 'Bool slug or directory with .bool/config (defaults to current directory)')
    .option('--secret <secret>', 'Bool secret (reads from .bool/config if omitted)')
    .action(action(async (slugOrDir, opts) => {
      const { slug, secret, dir } = resolveSlugAndSecret(slugOrDir);

      const claimSecret = opts.secret || secret;
      if (!claimSecret) {
        usage('No secret found.', {
          hint: 'Pass --secret <secret> or run from a directory with a .bool/config containing a secret.',
        });
      }

      if (opts.dryRun) {
        info(`[dry-run] Would POST /bools/${slug}/claim/`);
        return;
      }

      const result = await post(`/bools/${slug}/claim/`, { secret: claimSecret });

      const configDir = dir || process.cwd();
      const projConfig = readProjectConfig(configDir);
      if (projConfig.slug === slug) {
        writeProjectConfig(configDir, { slug: result.slug, name: result.name, secret: null });
      }

      const shaped = printData(result);
      if (shaped !== undefined) {
        success(`Claimed "${result.name}" (${result.slug})`);
        info(`URL: ${result.url}`);
      }
    }));
}
