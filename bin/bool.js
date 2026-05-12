#!/usr/bin/env node

import { createRequire } from 'node:module';
import { Command, Option } from 'commander';
import { register as auth } from '../src/commands/auth.js';
import { register as bools } from '../src/commands/bools.js';
import { register as shipit } from '../src/commands/shipit.js';
import { register as versions } from '../src/commands/versions.js';
import { register as skill } from '../src/commands/skill.js';
import { register as claim } from '../src/commands/claim.js';
import { register as git } from '../src/commands/git.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const program = new Command();

program
  .name('bool')
  .description('CLI for bool.com')
  .version(version)
  .configureHelp({ showGlobalOptions: true })
  // Agent-native global flags (Printing Press conventions). Subcommands inherit
  // these via cmd.optsWithGlobals() in the action wrapper.
  .option('--json', 'Output as JSON (auto when stdout is piped)')
  .option('--csv', 'Output as CSV')
  .option('--select <fields>', 'Comma-separated keys to keep in structured output')
  .option('--compact', 'Keep only high-gravity fields (id, slug, name, status, timestamps)')
  .option('--quiet', 'Suppress status messages on stderr')
  .addOption(new Option('--no-color', 'Disable ANSI colors (also honors NO_COLOR)'))
  .option('--no-input', 'Fail instead of prompting for interactive input')
  .option('--dry-run', 'Show what would happen without making changes');

auth(program);
bools(program);
shipit(program);
versions(program);
skill(program);
claim(program);
git(program);

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`✖ ${err.message}\n`);
  process.exit(2);
});
