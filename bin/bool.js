#!/usr/bin/env node

import { createRequire } from 'node:module';
import { Command } from 'commander';
import { register as auth } from '../src/commands/auth.js';
import { register as bools } from '../src/commands/bools.js';
import { register as versions } from '../src/commands/versions.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const program = new Command();

program
  .name('bool')
  .description('CLI for bool.com')
  .version(version);

auth(program);
bools(program);
versions(program);

program.parse();
