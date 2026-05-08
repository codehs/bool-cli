import chalk from 'chalk';
import Table from 'cli-table3';

// Agent-native output conventions (Printing Press).
//
// Resolution order for the output mode:
//   1. --csv         → CSV
//   2. --json        → JSON (pretty)
//   3. stdout piped  → JSON (no flag needed)
//   4. otherwise     → human table/text
//
// --quiet suppresses ✔/ℹ/⚠ status lines on stderr.
// --no-color / NO_COLOR disables ANSI colors (chalk also respects NO_COLOR).
// --select id,name  filters object keys for any structured output.
// --compact         keeps only high-gravity fields (id, slug, name, status, version, timestamps).

const COMPACT_KEYS = new Set([
  'id', 'slug', 'name', 'status', 'visibility',
  'version_number', 'file_count',
  'created_at', 'updated_at',
  'url',
]);

let GLOBAL = {
  quiet: false,
  noColor: false,
  json: false,
  csv: false,
  select: null,   // string[] | null
  compact: false,
};

export function configureOutput(opts = {}) {
  GLOBAL = {
    quiet: Boolean(opts.quiet),
    noColor: Boolean(opts.noColor) || process.env.NO_COLOR != null,
    json: Boolean(opts.json),
    csv: Boolean(opts.csv),
    select: opts.select ? String(opts.select).split(',').map((s) => s.trim()).filter(Boolean) : null,
    compact: Boolean(opts.compact),
  };
  if (GLOBAL.noColor) chalk.level = 0;
}

export function isStructured() {
  return GLOBAL.json || GLOBAL.csv || !process.stdout.isTTY;
}

function paint(fn, str) {
  return GLOBAL.noColor ? str : fn(str);
}

// --- Status messages (stderr; suppressed by --quiet) -----------------------

export function success(msg) {
  if (GLOBAL.quiet) return;
  process.stderr.write(paint(chalk.green, '✔') + ' ' + msg + '\n');
}

export function error(msg, { hint } = {}) {
  process.stderr.write(paint(chalk.red, '✖') + ' ' + msg + '\n');
  if (hint) process.stderr.write('  ' + paint(chalk.dim, hint) + '\n');
}

export function info(msg) {
  if (GLOBAL.quiet) return;
  process.stderr.write(paint(chalk.blue, 'ℹ') + ' ' + msg + '\n');
}

export function warn(msg) {
  if (GLOBAL.quiet) return;
  process.stderr.write(paint(chalk.yellow, '⚠') + ' ' + msg + '\n');
}

// --- Structured-data helpers ----------------------------------------------

function pickKeys(obj, keys) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

function applyShape(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(applyShape);

  let out = value;
  if (GLOBAL.compact) {
    out = pickKeys(out, [...COMPACT_KEYS].filter((k) => k in out));
  }
  if (GLOBAL.select) {
    out = pickKeys(out, GLOBAL.select);
  }
  return out;
}

function toCsv(value) {
  const rows = Array.isArray(value) ? value : [value];
  if (!rows.length) return '';
  const headers = Array.from(
    rows.reduce((set, row) => {
      if (row && typeof row === 'object') Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set()),
  );
  const escape = (v) => {
    if (v == null) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((h) => escape(row?.[h])).join(','));
  return lines.join('\n');
}

// Print structured data (object | array). Honors --json/--csv/--select/--compact
// and auto-emits JSON when stdout is piped.
export function data(value) {
  const shaped = applyShape(value);
  if (GLOBAL.csv) {
    process.stdout.write(toCsv(shaped) + '\n');
    return;
  }
  if (GLOBAL.json || !process.stdout.isTTY) {
    process.stdout.write(JSON.stringify(shaped, null, 2) + '\n');
    return;
  }
  // Caller is responsible for human rendering when not structured.
  return shaped;
}

// Backwards-compatible alias used by older callers.
export function json(value) {
  process.stdout.write(JSON.stringify(applyShape(value), null, 2) + '\n');
}

// Print a human-readable table. No-op when structured output is active —
// callers should pass the same data to `data()` instead.
export function table(headers, rows) {
  if (isStructured()) return;
  const t = new Table({ head: headers });
  for (const row of rows) t.push(row);
  process.stdout.write(t.toString() + '\n');
}

// Print the canonical "Showing N results" hint after a list command.
export function listFooter(shown, total, { hint } = {}) {
  if (GLOBAL.quiet || isStructured()) return;
  const suffix = total != null && total !== shown ? ` of ${total}` : '';
  const tail = hint || 'To narrow: add --limit, --select, or --json.';
  process.stderr.write(paint(chalk.dim, `Showing ${shown}${suffix} result${shown === 1 ? '' : 's'}. ${tail}`) + '\n');
}

// Plain stdout write (e.g. emit a single URL on success).
export function out(line) {
  process.stdout.write(line + (line.endsWith('\n') ? '' : '\n'));
}
