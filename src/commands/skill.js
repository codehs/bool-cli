import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { success, error, info } from '../utils/output.js';

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
    .action((directory, opts) => {
      const baseDir = path.resolve(opts.output || directory);

      if (!fs.existsSync(SKILL_SRC)) {
        error('Skill files not found in the bool-cli package.');
        process.exit(1);
      }

      const destDir = path.join(baseDir, '.agents', 'skills', 'using-bool-cli');

      try {
        copyDir(SKILL_SRC, destDir);
        success(`Skill installed to ${path.relative(process.cwd(), destDir) || destDir}`);
        info('Agents can now discover the bool-cli skill in your project.');
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });
}
