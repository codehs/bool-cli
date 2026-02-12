import { stub } from '../utils/output.js';

export function register(program) {
  const sites = program
    .command('sites')
    .description('Manage sites');

  sites
    .command('create')
    .description('Create a new site')
    .requiredOption('--name <name>', 'Site name')
    .action((opts) => stub('sites create'));

  sites
    .command('list')
    .description('List all sites')
    .action(() => stub('sites list'));

  sites
    .command('view')
    .description('View site details')
    .argument('<site-id>', 'Site ID')
    .action((siteId) => stub('sites view'));

  sites
    .command('update')
    .description('Update a site')
    .argument('<site-id>', 'Site ID')
    .option('--name <name>', 'New site name')
    .action((siteId, opts) => stub('sites update'));

  sites
    .command('delete')
    .description('Delete a site')
    .argument('<site-id>', 'Site ID')
    .action((siteId) => stub('sites delete'));
}
