import { stub } from '../utils/output.js';

export function register(program) {
  program
    .command('analytics')
    .description('View site analytics')
    .argument('<site-id>', 'Site ID')
    .option('--period <period>', 'Time period (e.g. 24h, 7d, 30d)', '7d')
    .action((siteId, opts) => stub('analytics'));
}
