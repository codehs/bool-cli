import { stub } from '../utils/output.js';

export function register(program) {
  const domains = program
    .command('domains')
    .description('Manage custom domains');

  domains
    .command('add')
    .description('Add a custom domain to a site')
    .argument('<site-id>', 'Site ID')
    .argument('<domain>', 'Domain name')
    .action((siteId, domain) => stub('domains add'));

  domains
    .command('remove')
    .description('Remove a custom domain from a site')
    .argument('<site-id>', 'Site ID')
    .argument('<domain>', 'Domain name')
    .action((siteId, domain) => stub('domains remove'));

  domains
    .command('list')
    .description('List domains for a site')
    .argument('<site-id>', 'Site ID')
    .action((siteId) => stub('domains list'));
}
