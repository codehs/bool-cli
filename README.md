# bool-cli

CLI tool for managing projects on [bool.com](https://bool.com).

## Installation

```bash
npm install
npm link
```

This installs the `bool` command globally.

## Setup

```bash
bool auth login      # Paste your API key from the bool.com web UI
bool auth status     # Verify connection
```

Your API key is saved to `~/.config/bool-cli/config.json`. You can also set the `BOOL_API_KEY` environment variable.

## Commands

### Authentication

| Command | Description |
|---|---|
| `bool auth login` | Save API key |
| `bool auth status` | Check auth + API health |

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

Deprecated but still supported:
- `bool bools ...` commands now print a deprecation warning and map to top-level commands.
- `bool bools visibility ...` is deprecated; use `bool update [slug] --visibility <value>`.

> **Slug resolution:** When `[slug]` is omitted, commands read it from the `.bool/config` file in the current directory. This file is created automatically by `shipit`, `deploy`, `pull`, and `show` (or `info` alias).

### Versions & Deployment

| Command | Description |
|---|---|
| `bool versions [slug]` | List version history |
| `bool deploy [slug] [dir]` | Deploy local files as a new version |
| `bool pull [slug] [dir]` | Download files to a local directory |

#### Deploy options

```bash
bool deploy my-project ./src --message "Added dark mode" --exclude "*.test.js"
```

- `--message` / `-m` — Commit message
- `--exclude` — Exclude pattern (repeatable)
- Binary files are automatically skipped
- Respects `.boolignore` files (gitignore syntax)
- Default excludes: `.git`, `node_modules`, `__pycache__`, `.DS_Store`, `.bool`

#### Pull options

```bash
bool pull my-project ./local-copy --version 3
```

- `--version` — Specific version number (default: latest)

### JSON output

All commands support `--json` for machine-readable output:

```bash
bool list --json
bool show my-project --json
```

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
    bool.js              # Entry point
  src/
    commands/
      auth.js            # auth login, auth status
      bools.js           # top-level bool commands (+ deprecated bools wrappers)
      shipit.js          # shipit (anonymous create + deploy)
      versions.js        # versions, deploy, pull
    utils/
      api.js             # API client (fetch-based)
      config.js          # Global config + project-level .bool/config
      files.js           # File reading, .boolignore, binary detection
      output.js          # Output formatting (tables, colors, JSON)
```
