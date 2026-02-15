import { createInterface } from 'node:readline';
import { getApiKey, setApiKey } from '../utils/config.js';
import { healthCheck } from '../utils/api.js';
import { success, error, info } from '../utils/output.js';

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function register(program) {
  const auth = program
    .command('auth')
    .description('Manage authentication');

  auth
    .command('login')
    .description('Save API key')
    .action(async () => {
      const key = await prompt('Enter your bool.com API key: ');
      if (!key) {
        error('No API key provided.');
        process.exit(1);
      }
      setApiKey(key);
      success('API key saved to ~/.config/bool-cli/config.json');
    });

  auth
    .command('status')
    .description('Check auth and API health')
    .action(async () => {
      const key = getApiKey();
      if (key) {
        const masked = key.slice(0, 8) + '…' + key.slice(-4);
        info(`API key: ${masked}`);
      } else {
        error('No API key configured. Run: bool auth login');
        process.exit(1);
      }

      try {
        await healthCheck();
        success('API is reachable and healthy.');
      } catch (err) {
        error(`API health check failed: ${err.message}`);
        process.exit(1);
      }
    });
}
