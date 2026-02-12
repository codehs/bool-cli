import { stub } from '../utils/output.js';

export function register(program) {
  program
    .command('login')
    .description('Log in to bool.com')
    .action(() => stub('login'));

  program
    .command('logout')
    .description('Log out of bool.com')
    .action(() => stub('logout'));

  program
    .command('signup')
    .description('Create a new bool.com account')
    .action(() => stub('signup'));

  program
    .command('whoami')
    .description('Show current logged-in user')
    .action(() => stub('whoami'));
}
