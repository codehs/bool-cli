// Typed exit codes (Printing Press convention) so agents can self-correct
// without parsing error text.
export const EXIT = {
  SUCCESS: 0,
  USAGE: 2,
  NOT_FOUND: 3,
  AUTH: 4,
  API: 5,
  RATE_LIMITED: 7,
};

export class CliError extends Error {
  constructor(message, code = EXIT.API, { hint } = {}) {
    super(message);
    this.code = code;
    this.hint = hint;
  }
}
