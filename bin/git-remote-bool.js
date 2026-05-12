#!/usr/bin/env node
//
// git-remote-bool — git remote helper that deploys to bool.com on push.
//
// Set up:
//   git remote add bool bool::<slug>      (or: bool git init)
//
// Use:
//   git push bool main
//
// When the user runs `git push bool <ref>`, git invokes this binary as
// `git-remote-bool bool <slug>` and speaks the remote-helper protocol on
// stdin/stdout. We accept the push, extract the pushed commit's tree into
// a temporary git worktree, and shell out to `bool deploy <slug>` from
// inside it.
//
// Protocol reference: `git help remote-helpers`.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';

const address = process.argv[3] || '';

let pushBatch = [];

const rl = readline.createInterface({ input: process.stdin });

rl.on('line', (line) => {
  try {
    handle(line);
  } catch (err) {
    process.stderr.write(`✖ git-remote-bool: ${err.message}\n`);
    process.exit(1);
  }
});

rl.on('close', () => process.exit(0));

function out(s) {
  process.stdout.write(s);
}

function handle(line) {
  if (line === 'capabilities') {
    out('push\noption\n\n');
    return;
  }
  if (line.startsWith('option ')) {
    // Accept (and ignore) all options so git doesn't bail.
    out('ok\n');
    return;
  }
  if (line === 'list' || line === 'list for-push') {
    // We don't track remote refs. An empty list tells git the remote has
    // no refs yet, so any local ref is treated as new and gets pushed.
    out('\n');
    return;
  }
  if (line.startsWith('push ')) {
    pushBatch.push(line.slice(5));
    return;
  }
  if (line === '') {
    if (pushBatch.length) {
      doPush(pushBatch);
      pushBatch = [];
    }
    return;
  }
  // Unknown command: end the batch politely.
  out('\n');
}

function doPush(specs) {
  const slug = resolveSlug();

  for (const raw of specs) {
    const spec = raw.replace(/^\+/, '');
    const [src, dst] = spec.split(':');

    if (!slug) {
      out(`error ${dst} no slug configured; set: git remote set-url bool bool::<slug>\n`);
      continue;
    }

    const result = deployRef(src, slug, dst);
    out(result + '\n');
  }
  out('\n');
}

function resolveSlug() {
  if (address) return address;
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.bool', 'config'), 'utf-8'));
    return cfg.slug || null;
  } catch {
    return null;
  }
}

function deployRef(src, slug, dst) {
  const rev = spawnSync('git', ['rev-parse', src], { encoding: 'utf-8' });
  if (rev.status !== 0) {
    return `error ${dst} could not resolve ${src}`;
  }
  const sha = rev.stdout.trim();

  const worktree = fs.mkdtempSync(path.join(os.tmpdir(), 'bool-deploy-'));
  try {
    const add = spawnSync('git', ['worktree', 'add', '--detach', worktree, sha], {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf-8',
    });
    if (add.status !== 0) {
      return `error ${dst} git worktree add failed: ${(add.stderr || '').trim()}`;
    }

    const branch = src.replace(/^refs\/heads\//, '');
    const message = `git push ${branch} (${sha.slice(0, 7)})`;

    // Child stderr forwards to the user; child stdout is discarded so it
    // doesn't pollute the helper protocol on our stdout. The explicit `.`
    // prevents `bool deploy`'s slug-or-dir heuristic from reinterpreting the
    // slug as a directory path if the worktree contains a folder of the
    // same name.
    const deploy = spawnSync('bool', ['deploy', slug, '.', '-m', message], {
      cwd: worktree,
      stdio: ['ignore', 'pipe', 'inherit'],
    });

    if (deploy.status !== 0) {
      return `error ${dst} bool deploy exited with status ${deploy.status}`;
    }
    return `ok ${dst}`;
  } finally {
    spawnSync('git', ['worktree', 'remove', '--force', worktree], { stdio: 'ignore' });
    if (fs.existsSync(worktree)) {
      fs.rmSync(worktree, { recursive: true, force: true });
    }
  }
}
