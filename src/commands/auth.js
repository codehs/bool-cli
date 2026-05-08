import { createInterface } from 'node:readline';
import { getApiKey, setApiKey, getApiUrl } from '../utils/config.js';
import { healthCheck, get } from '../utils/api.js';
import { success, info, data as printData } from '../utils/output.js';
import { action } from '../utils/action.js';
import { CliError, EXIT } from '../utils/exit.js';

function prompt(question, { noInput }) {
  if (noInput) {
    throw new CliError('Interactive prompt required but --no-input is set.', EXIT.USAGE, {
      hint: 'Pipe the API key on stdin or set BOOL_API_KEY.',
    });
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function readStdin() {
  if (process.stdin.isTTY) return null;
  let buf = '';
  for await (const chunk of process.stdin) buf += chunk;
  return buf.trim() || null;
}

export function register(program) {
  const auth = program.command('auth').description('Manage authentication');

  auth
    .command('login')
    .description('Save API key (reads from stdin or prompts)')
    .action(action(async (opts) => {
      const piped = await readStdin();
      const key = piped || await prompt('Enter your bool.com API key: ', { noInput: opts.input === false });
      if (!key) {
        throw new CliError('No API key provided.', EXIT.USAGE, {
          hint: 'Pipe the key: echo $KEY | bool auth login',
        });
      }
      if (opts.dryRun) {
        info('[dry-run] Would save API key to ~/.config/bool-cli/config.json');
        return;
      }
      setApiKey(key);
      success('API key saved to ~/.config/bool-cli/config.json');
    }));

  auth
    .command('status')
    .description('Check auth and API health')
    .action(action(async () => {
      const key = getApiKey();
      if (!key) {
        throw new CliError('No API key configured.', EXIT.AUTH, {
          hint: 'Run: bool auth login',
        });
      }
      const masked = key.slice(0, 8) + '…' + key.slice(-4);

      let healthError = null;
      try {
        await healthCheck();
      } catch (err) {
        healthError = err.message;
      }
      const healthy = healthError == null;

      const shaped = printData({
        api_key: masked,
        api_url: getApiUrl(),
        healthy,
        ...(healthy ? {} : { error: healthError }),
      });
      if (shaped === undefined) {
        if (!healthy) process.exitCode = EXIT.API;
        return;
      }

      info(`API key: ${masked}`);
      info(`API URL: ${getApiUrl()}`);
      if (healthy) {
        success('API is reachable and healthy.');
      } else {
        throw new CliError(`API health check failed: ${healthError}`, EXIT.API);
      }
    }));

  auth
    .command('doctor')
    .description('Diagnose auth + API connectivity and report what to fix')
    .action(action(async () => {
      const checks = [];

      // 1. Key present?
      const key = getApiKey();
      const source = process.env.BOOL_API_KEY ? 'BOOL_API_KEY env var' : (key ? 'config file' : 'none');
      checks.push({
        check: 'api_key_present',
        ok: Boolean(key),
        detail: key ? `loaded from ${source}` : 'missing — run: bool auth login',
      });

      // 2. Health endpoint reachable (no auth)?
      try {
        await healthCheck();
        checks.push({ check: 'api_reachable', ok: true, detail: getApiUrl() });
      } catch (err) {
        checks.push({ check: 'api_reachable', ok: false, detail: err.message });
      }

      // 3. Authenticated request works?
      if (key) {
        try {
          await get('/bools/');
          checks.push({ check: 'api_key_valid', ok: true, detail: 'authenticated request succeeded' });
        } catch (err) {
          checks.push({ check: 'api_key_valid', ok: false, detail: err.message });
        }
      } else {
        checks.push({ check: 'api_key_valid', ok: false, detail: 'skipped — no key configured' });
      }

      const allOk = checks.every((c) => c.ok);
      const report = { ok: allOk, checks };

      const shaped = printData(report);
      if (shaped === undefined) {
        if (!allOk) process.exitCode = EXIT.AUTH;
        return;
      }

      for (const c of checks) {
        if (c.ok) success(`${c.check}: ${c.detail}`);
        else info(`✖ ${c.check}: ${c.detail}`);
      }
      if (!allOk) {
        throw new CliError('Doctor reported failures.', EXIT.AUTH, {
          hint: 'Re-run after fixing the items above, or pass --json for machine-readable output.',
        });
      }
      success('All checks passed.');
    }));
}
