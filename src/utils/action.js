import { configureOutput, error } from './output.js';
import { CliError, EXIT } from './exit.js';

// Wrap a commander action so global agent-native flags configure output once
// and any thrown error becomes a typed exit code with a usage hint.
export function action(fn) {
  return async function wrapped(...args) {
    const cmd = args[args.length - 1];
    const opts = cmd.optsWithGlobals ? cmd.optsWithGlobals() : cmd.opts();
    configureOutput({
      quiet: opts.quiet,
      noColor: opts.color === false || opts.noColor,
      json: opts.json,
      csv: opts.csv,
      select: opts.select,
      compact: opts.compact,
    });

    // Replace commander's per-command options (2nd-to-last arg) with the
    // globally-merged opts so inner handlers see --json, --dry-run, etc.
    const merged = [...args];
    if (merged.length >= 2) merged[merged.length - 2] = opts;

    try {
      await fn(...merged);
    } catch (err) {
      if (err instanceof CliError) {
        error(err.message, { hint: err.hint });
        process.exit(err.code);
      }
      error(err.message || String(err), {
        hint: `See: ${cmd.parent ? cmd.parent.name() : 'bool'} ${cmd.name()} --help`,
      });
      process.exit(EXIT.API);
    }
  };
}

// Convenience: throw a typed usage error.
export function usage(message, { hint } = {}) {
  throw new CliError(message, EXIT.USAGE, { hint });
}

// Convenience: throw a typed not-found error.
export function notFound(message, { hint } = {}) {
  throw new CliError(message, EXIT.NOT_FOUND, { hint });
}
