import { stub } from '../utils/output.js';

export function register(program) {
  const billing = program
    .command('billing')
    .description('Manage billing and usage');

  billing
    .command('plan')
    .description('View current billing plan')
    .action(() => stub('billing plan'));

  billing
    .command('usage')
    .description('View current usage')
    .action(() => stub('billing usage'));
}
