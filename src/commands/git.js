import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readProjectConfig } from '../utils/config.js';
import { success, info, data as printData } from '../utils/output.js';
import { action, usage } from '../utils/action.js';

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf-8' });
}

export function register(program) {
  const git = program.command('git').description('Git integration (push-to-deploy)');

  git
    .command('init')
    .description('Add a `bool::<slug>` git remote so `git push bool <branch>` deploys this Bool')
    .option('--remote <name>', 'Remote name', 'bool')
    .option('--slug <slug>', 'Bool slug (defaults to .bool/config in cwd)')
    .action(action(async (opts) => {
      const slug = opts.slug || readProjectConfig(process.cwd()).slug;
      if (!slug) {
        usage('No slug.', {
          hint: 'Run `bool create <name>` or `bool shipit` first, or pass --slug.',
        });
      }

      if (!fs.existsSync(path.join(process.cwd(), '.git'))) {
        usage('Not a git repository.', { hint: 'Run `git init` first.' });
      }

      const url = `bool::${slug}`;

      if (opts.dryRun) {
        info(`[dry-run] Would set git remote "${opts.remote}" to ${url}`);
        return;
      }

      const existing = run('git', ['remote', 'get-url', opts.remote]);
      const op = existing.status === 0 ? 'set-url' : 'add';
      const result = run('git', ['remote', op, opts.remote, url]);
      if (result.status !== 0) {
        usage(`git remote ${op} failed: ${(result.stderr || '').trim()}`);
      }

      const summary = { remote: opts.remote, url, slug, action: op === 'add' ? 'added' : 'updated' };
      const shaped = printData(summary);
      if (shaped !== undefined) {
        success(`${op === 'add' ? 'Added' : 'Updated'} remote "${opts.remote}" → ${url}`);
        info(`Deploy with: git push ${opts.remote} <branch>`);
      }
    }));
}
