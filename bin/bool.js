#!/usr/bin/env node

import { Command } from 'commander';
import { register as auth } from '../src/commands/auth.js';
import { register as sites } from '../src/commands/sites.js';
import { register as deploy } from '../src/commands/deploy.js';
import { register as domains } from '../src/commands/domains.js';
import { register as settings } from '../src/commands/settings.js';
import { register as teams } from '../src/commands/teams.js';
import { register as billing } from '../src/commands/billing.js';
import { register as logs } from '../src/commands/logs.js';
import { register as analytics } from '../src/commands/analytics.js';

const program = new Command();

program
  .name('bool')
  .description('CLI for managing websites on bool.com')
  .version('0.1.0');

auth(program);
sites(program);
deploy(program);
domains(program);
settings(program);
teams(program);
billing(program);
logs(program);
analytics(program);

program.parse();
