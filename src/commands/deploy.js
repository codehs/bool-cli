import { stub } from '../utils/output.js';

export function register(program) {
  program
    .command('deploy')
    .description('Deploy a site')
    .argument('[dir]', 'Directory to deploy', '.')
    .requiredOption('--site <site-id>', 'Site ID to deploy to')
    .action((dir, opts) => stub('deploy'));

  program
    .command('preview')
    .description('Create a preview deployment')
    .argument('[dir]', 'Directory to deploy', '.')
    .requiredOption('--site <site-id>', 'Site ID to preview')
    .action((dir, opts) => stub('preview'));

  program
    .command('rollback')
    .description('Rollback to a previous deployment')
    .argument('<site-id>', 'Site ID')
    .requiredOption('--to <deployment-id>', 'Deployment ID to rollback to')
    .action((siteId, opts) => stub('rollback'));
}
