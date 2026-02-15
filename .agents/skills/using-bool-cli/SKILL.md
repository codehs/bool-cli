---
name: using-bool-cli
description: "Manages Bool.com projects via the bool CLI. Use when deploying code to Bool.com, managing Bools, pulling remote files, or working with Bool versions."
---

# Using bool-cli

CLI tool for managing projects on [Bool.com](https://bool.com). Requires Node.js.

## Prerequisites

1. **Install**: `npm install -g bool-cli` (or `npm link` from the bool-cli repo)
2. **Authenticate**: Run `bool auth login` and paste your API key from the Bool.com web UI
3. **Verify**: Run `bool auth status` to confirm the connection

The API key is saved to `~/.config/bool-cli/config.json`. You can also set the `BOOL_API_KEY` environment variable instead.

## Important: Non-Interactive Commands

The `bool auth login` and `bool delete <slug>` commands are **interactive** (they prompt for input). When using them from an agent:

- **Auth**: Set the `BOOL_API_KEY` environment variable instead of running `bool auth login`
- **Delete**: Always pass `-y` / `--yes` to skip the confirmation prompt: `bool delete <slug> -y`

## Commands Reference

### Authentication

```bash
bool auth login          # Interactive: prompts for API key
bool auth status         # Check auth + API health (non-interactive)
```

### Managing Bools

```bash
bool bools list [count]        # List Bools (default: 5)
bool bools create <name>       # Create a new Bool
bool bools info <slug>         # Show Bool details + latest version info
bool bools update <slug> --name "New Name" --description "desc" --visibility public
bool bools delete <slug> -y    # Delete a Bool (always use -y to skip prompt)
bool bools open <slug>         # Open Bool in browser
bool bools visibility <slug>         # Show current visibility
bool bools visibility <slug> --set private    # Change visibility
```

Visibility options: `private`, `team`, `unlisted`, `public`

### Versions & Deployment

```bash
bool versions <slug>                           # List version history
bool deploy <slug> [dir] -m "commit message"   # Deploy local files as new version
bool pull <slug> [dir] --version N             # Download files locally
```

### JSON Output

All commands support `--json` for machine-readable output. **Always use `--json` when you need to parse output programmatically.**

```bash
bool list --json
bool info my-project --json
bool versions my-project --json
```

## Common Workflows

### Create and deploy a new Bool

```bash
bool bools create "My Project"
# note the slug from the output, e.g. "my-project"
bool deploy my-project ./src -m "Initial deploy"
```

### Pull, edit, and redeploy

```bash
bool pull my-project ./my-project
# ... make changes to files in ./my-project/ ...
bool deploy my-project ./my-project -m "Updated files"
```

### Check what's deployed

```bash
bool bools info my-project            # See latest version summary
bool versions my-project        # See full version history
bool pull my-project ./tmp      # Download current files to inspect
```

### Manage visibility

```bash
bool bools visibility my-project            # Show current visibility
bool bools visibility my-project --set private   # Make it private
bool bools visibility my-project --set public    # Make it public
```

### Deploy a specific subdirectory

```bash
bool deploy my-project ./src --exclude "*.test.js" --exclude "*.spec.js" -m "Production build"
```

## Deploy Behavior

- `bool deploy` recursively reads the directory and uploads all text files
- **Binary files** (images, PDFs, archives, fonts, etc.) are automatically skipped
- **Default excludes**: `.git`, `node_modules`, `__pycache__`, `.DS_Store`
- **Custom excludes**: Use `--exclude <pattern>` (repeatable) for additional patterns
- **`.boolignore`**: If a `.boolignore` file exists in the deploy directory, it is respected (gitignore syntax)
- File paths in the payload are **relative** to the deploy directory

## Pull Behavior

- `bool pull <slug>` downloads files to `./<slug>/` by default
- Specify a custom output directory: `bool pull <slug> ./my-dir`
- Pull a specific version: `bool pull <slug> --version 3`
- Creates subdirectories as needed

## Error Handling

- All errors print to stderr with a non-zero exit code
- API errors surface the server's error message (e.g., `"Bool not found"`)
- If no API key is configured, commands fail with: `No API key configured. Run: bool auth login`

## Tips

- Use `bool list --json | jq '.[].slug'` to get all slugs for scripting
- The Bool **slug** (not name) is the identifier used in all commands
- After `bool create`, the slug is derived from the name (e.g., "My Project" → `my-project`)
- Use `bool info <slug> --json` to get the latest version number programmatically
