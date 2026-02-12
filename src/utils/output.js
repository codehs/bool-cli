import chalk from 'chalk';

export function success(msg) {
  console.log(chalk.green('✔') + ' ' + msg);
}

export function error(msg) {
  console.error(chalk.red('✖') + ' ' + msg);
}

export function info(msg) {
  console.log(chalk.blue('ℹ') + ' ' + msg);
}

export function warn(msg) {
  console.log(chalk.yellow('⚠') + ' ' + msg);
}

export function stub(command) {
  console.log(chalk.yellow('[TODO]') + ` ${command} not yet implemented`);
}
