import { stub } from '../utils/output.js';

export function register(program) {
  const logs = program
    .command('logs')
    .description('View site logs');

  logs
    .command('view')
    .description('View recent logs')
    .argument('<site-id>', 'Site ID')
    .action((siteId) => stub('logs view'));

  logs
    .command('tail')
    .description('Tail logs in real time')
    .argument('<site-id>', 'Site ID')
    .action((siteId) => stub('logs tail'));
}
