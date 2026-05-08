import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { success, info, data as printData } from '../utils/output.js';
import { action } from '../utils/action.js';
import { CliError, EXIT } from '../utils/exit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..', '..');
const SKILL_SRC = path.join(PKG_ROOT, '.agents', 'skills', 'using-bool-cli');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function register(program) {
  program
    .command('skill')
    .description('Download the bool-cli agent skill into your project')
    .argument('[directory]', 'Target directory (default: current directory)', '.')
    .option('--output <path>', 'Custom output path for the skill folder')
    .action(action((directory, opts) => {
      const baseDir = path.resolve(opts.output || directory);
      if (!fs.existsSync(SKILL_SRC)) {
        throw new CliError('Skill files not found in the bool-cli package.', EXIT.NOT_FOUND);
      }
      const destDir = path.join(baseDir, '.agents', 'skills', 'using-bool-cli');

      if (opts.dryRun) {
        info(`[dry-run] Would install skill to ${destDir}`);
        return;
      }

      copyDir(SKILL_SRC, destDir);

      const summary = { installed_to: destDir };
      const shaped = printData(summary);
      if (shaped !== undefined) {
        success(`Skill installed to ${path.relative(process.cwd(), destDir) || destDir}`);
        info('Agents can now discover the bool-cli skill in your project.');
      }
    }));
}
