import chalk from 'chalk';
import Table from 'cli-table3';

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

export function table(headers, rows) {
  const t = new Table({ head: headers });
  for (const row of rows) t.push(row);
  console.log(t.toString());
}

export function json(data) {
  console.log(JSON.stringify(data, null, 2));
}
