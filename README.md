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

### Bools

| Command | Description |
|---|---|
| `bool bools list` | List all Bools |
| `bool bools create <name>` | Create a new Bool |
| `bool bools info <slug>` | Show Bool details + latest version |
| `bool bools update <slug> [--name] [--description] [--visibility]` | Update a Bool |
| `bool bools delete <slug>` | Soft-delete (with confirmation) |
| `bool bools open <slug>` | Open editor URL in browser |
| `bool bools visibility <slug>` | Show Bool visibility |
| `bool bools visibility <slug> --set <value>` | Change Bool visibility |

### Versions & Deployment

| Command | Description |
|---|---|
| `bool versions <slug>` | List version history |
| `bool deploy <slug> [dir]` | Deploy local files as a new version |
| `bool pull <slug> [dir]` | Download files to a local directory |

#### Deploy options

```bash
bool deploy my-project ./src --message "Added dark mode" --exclude "*.test.js"
```

- `--message` / `-m` — Commit message
- `--exclude` — Exclude pattern (repeatable, default excludes: `.git`, `node_modules`, `__pycache__`)
- Binary files are automatically skipped
- Respects `.boolignore` files (gitignore syntax)

#### Pull options

```bash
bool pull my-project ./local-copy --version 3
```

- `--version` — Specific version number (default: latest)

### JSON output

All commands support `--json` for machine-readable output:

```bash
bool list --json
bool info my-project --json
```

## Project Structure

```
bool-cli/
  bin/
    bool.js              # Entry point
  src/
    commands/
      auth.js            # auth login, auth status
      bools.js           # bools list, create, info, update, delete, open, visibility
      versions.js        # versions, deploy, pull
    utils/
      config.js          # Config file + env var loading
      api.js             # API client (fetch-based)
      output.js          # Output formatting (tables, colors, JSON)
```
