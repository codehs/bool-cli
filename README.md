# bool-cli

CLI tool for managing projects on [bool.com](https://bool.com).

`bool` follows the [Printing Press](https://printingpress.dev/) agent-native CLI conventions: machine-readable output by default when piped, typed exit codes, and standard flags on every command.

## Installation

```bash
npm install -g bool-cli
```

This installs the `bool` command globally.

## Setup

```bash
bool auth login      # Paste your API key from the bool.com web UI
bool auth status     # Verify connection
bool auth doctor     # Diagnose auth + API connectivity
```

Your API key is saved to `~/.config/bool-cli/config.json`. You can also set the `BOOL_API_KEY` environment variable, or pipe a key into login:

```bash
echo "$BOOL_API_KEY" | bool auth login
```

## Agent-native flags

These flags work on every command. They can appear in any position.

| Flag | Description |
|---|---|
| `--json` | Output structured JSON. Implicit when stdout is piped. |
| `--csv` | Output CSV. |
| `--select <fields>` | Comma-separated keys to keep in structured output (e.g. `--select slug,visibility`). |
| `--compact` | Keep only high-gravity fields (`id`, `slug`, `name`, `status`, `visibility`, `version_number`, `file_count`, `created_at`, `updated_at`, `url`). |
| `--quiet` | Suppress status messages on stderr. |
| `--no-color` | Disable ANSI colors (also honors `NO_COLOR`). |
| `--no-input` | Fail instead of prompting for interactive input. |
| `--dry-run` | Show what would happen without making changes. |

Status messages (`✔ ✖ ℹ ⚠`) go to **stderr**. Structured data goes to **stdout**. This means you can pipe JSON without losing log output:

```bash
bool list | jq '.[].slug'
bool show my-project --select slug,visibility,url
bool list --csv > bools.csv
```

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `2` | Usage error (missing/invalid argument) |
| `3` | Not found |
| `4` | Authentication failure |
| `5` | API error |
| `7` | Rate limited |

Errors are written to stderr in the format `✖ <message>` followed by an indented hint pointing at the flag, value, or remediation step — so agents can self-correct in one retry without parsing free-text errors.

## Commands

### Authentication

| Command | Description |
|---|---|
| `bool auth login` | Save API key (reads from stdin or prompts) |
| `bool auth status` | Check auth + API health |
| `bool auth doctor` | Diagnose auth + API connectivity |

### Ship It

The fastest way to get code live — no account or API key required:

```bash
bool shipit [directory]
```

Creates an anonymous Bool and uploads files in one step. On subsequent runs from the same directory, it updates the existing Bool automatically (tracked via `.bool/config`).

#### Options

| Option | Description |
|---|---|
| `--slug <slug>` | Update an existing anonymous Bool instead of creating a new one |
| `--name <name>` | Bool name (defaults to config, then directory name) |
| `-m, --message <msg>` | Commit message (used when updating) |
| `--base-url <url>` | Base URL (or set `BOOL_BASE_URL`) |

### Bools

| Command | Description |
|---|---|
| `bool list [--limit <n>]` | List Bools (default: 20) |
| `bool create <name>` | Create a new Bool |
| `bool show [slug]` | Show Bool details + latest version |
| `bool update [slug] [--name] [--description] [--visibility]` | Update a Bool |
| `bool delete [slug] [-y]` | Delete (with confirmation, skip with `-y`) |
| `bool open [slug]` | Open editor URL in browser |

Aliases:
- `bool ls` for `bool list`
- `bool get` / `bool info` for `bool show`
- `bool rm` for `bool delete`

> **Slug resolution:** When `[slug]` is omitted, commands read it from the `.bool/config` file in the current directory. This file is created automatically by `shipit`, `deploy`, `pull`, and `show`.

### Versions & Deployment

| Command | Description |
|---|---|
| `bool versions [slug]` | List version history |
| `bool deploy [slug] [dir]` | Deploy local files as a new version (creates Bool if needed) |
| `bool pull [slug] [dir]` | Download files to a local directory |

#### Deploy options

```bash
bool deploy my-project ./src --message "Added dark mode" --exclude "*.test.js"
```

- **Auto-create**: If no slug is provided and `.bool/config` doesn't exist, a new Bool is created automatically (named after the directory)
- `--message` / `-m` — Commit message
- `--exclude` — Exclude pattern (repeatable)
- Binary files are automatically skipped
- Respects `.boolignore` files (gitignore syntax)
- Default excludes: `.git`, `node_modules`, `__pycache__`, `.DS_Store`, `.bool`
- **Live URL**: Displayed in output after successful deployment

#### Pull options

```bash
bool pull my-project ./local-copy --version 3
```

- `--version` — Specific version number (default: latest)

### Claim

```bash
bool claim [slug-or-directory] [--secret <secret>]
```

Transfers an anonymous Bool to your account using the secret stored in `.bool/config`.

### Skill

```bash
bool skill [directory]
```

Installs the bool-cli agent skill into the target directory's `.agents/` folder so coding agents discover the available CLI surface.

## Project Config

Running `shipit`, `deploy`, `pull`, or `show` creates a `.bool/config` file in the project directory. This JSON file stores `slug` and `name` so you can run commands without specifying the slug each time:

```bash
cd my-project
bool deploy              # slug read from .bool/config
bool show                # slug read from .bool/config
bool versions            # slug read from .bool/config
```

Add `.bool/` to your `.gitignore`.

## Project Structure

```
bool-cli/
  bin/
    bool.js              # Entry point + global flags
  src/
    commands/
      auth.js            # auth login, status, doctor
      bools.js           # list, create, show, update, delete, open
      shipit.js          # shipit (anonymous create + deploy)
      versions.js        # versions, deploy, pull
      claim.js           # claim anonymous Bool
      skill.js           # install agent skill
    utils/
      action.js          # action wrapper: typed errors + global flag plumbing
      api.js             # API client → typed CliError on HTTP failure
      config.js          # Global config + project-level .bool/config
      exit.js            # Typed exit codes (Printing Press convention)
      files.js           # File reading, .boolignore, binary detection
      output.js          # Output: auto-JSON on pipe, CSV, --select, --compact
```
