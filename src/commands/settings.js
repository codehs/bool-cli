import { stub } from '../utils/output.js';

export function register(program) {
  const settings = program
    .command('settings')
    .description('Manage site settings');

  settings
    .command('view')
    .description('View site settings')
    .argument('<site-id>', 'Site ID')
    .action((siteId) => stub('settings view'));

  settings
    .command('update')
    .description('Update a site setting')
    .argument('<site-id>', 'Site ID')
    .requiredOption('--key <key>', 'Setting key')
    .requiredOption('--value <value>', 'Setting value')
    .action((siteId, opts) => stub('settings update'));
}
