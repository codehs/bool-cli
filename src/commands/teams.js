import { stub } from '../utils/output.js';

export function register(program) {
  const teams = program
    .command('teams')
    .description('Manage teams');

  teams
    .command('list')
    .description('List teams')
    .action(() => stub('teams list'));

  teams
    .command('switch')
    .description('Switch active team')
    .argument('<team-id>', 'Team ID')
    .action((teamId) => stub('teams switch'));

  teams
    .command('invite')
    .description('Invite a member to the team')
    .argument('<email>', 'Email address')
    .option('--role <role>', 'Member role', 'member')
    .action((email, opts) => stub('teams invite'));

  teams
    .command('remove')
    .description('Remove a member from the team')
    .argument('<email>', 'Email address')
    .action((email) => stub('teams remove'));
}
