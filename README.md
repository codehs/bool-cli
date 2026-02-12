# bool-cli

CLI tool for managing websites on [bool.com](https://bool.com).

## Installation

```bash
npm install
npm link
```

This installs the `bool` command globally.

## Usage

```bash
bool <command> [options]
```

Run `bool --help` to see all available commands, or `bool <command> --help` for details on a specific command.

## Commands

### Authentication

| Command | Description |
|---|---|
| `bool login` | Log in to bool.com |
| `bool logout` | Log out |
| `bool signup` | Create a new account |
| `bool whoami` | Show current logged-in user |

### Sites

| Command | Description |
|---|---|
| `bool sites create --name <name>` | Create a new site |
| `bool sites list` | List all sites |
| `bool sites view <site-id>` | View site details |
| `bool sites update <site-id> --name <name>` | Update a site |
| `bool sites delete <site-id>` | Delete a site |

### Deployments

| Command | Description |
|---|---|
| `bool deploy [dir] --site <site-id>` | Deploy a directory to a site |
| `bool preview [dir] --site <site-id>` | Create a preview deployment |
| `bool rollback <site-id> --to <deployment-id>` | Rollback to a previous deployment |

### Domains

| Command | Description |
|---|---|
| `bool domains add <site-id> <domain>` | Add a custom domain |
| `bool domains remove <site-id> <domain>` | Remove a custom domain |
| `bool domains list <site-id>` | List domains for a site |

### Settings

| Command | Description |
|---|---|
| `bool settings view <site-id>` | View site settings |
| `bool settings update <site-id> --key <k> --value <v>` | Update a setting |

### Teams

| Command | Description |
|---|---|
| `bool teams list` | List teams |
| `bool teams switch <team-id>` | Switch active team |
| `bool teams invite <email> --role <role>` | Invite a member (default role: member) |
| `bool teams remove <email>` | Remove a member |

### Billing

| Command | Description |
|---|---|
| `bool billing plan` | View current billing plan |
| `bool billing usage` | View current usage |

### Logs

| Command | Description |
|---|---|
| `bool logs view <site-id>` | View recent logs |
| `bool logs tail <site-id>` | Tail logs in real time |

### Analytics

| Command | Description |
|---|---|
| `bool analytics <site-id> --period <period>` | View site analytics (default: 7d) |

## Project Structure

```
boolcli/
  bin/
    bool.js              # Entry point
  src/
    commands/
      auth.js            # login, logout, signup, whoami
      sites.js           # create, list, view, update, delete
      deploy.js          # deploy, preview, rollback
      domains.js         # add, remove, list
      settings.js        # view, update
      teams.js           # invite, remove, list, switch
      billing.js         # plan, usage
      logs.js            # view, tail
      analytics.js       # view
    utils/
      config.js          # Config helpers (getToken, setToken, getApiUrl)
      api.js             # API client (get, post, put, delete)
      output.js          # Output formatting helpers
```

## Development

All command handlers are currently stubbed and will print a `[TODO]` message. Replace the stubs with real API calls as the bool.com API becomes available.

The utility modules in `src/utils/` provide consistent patterns for configuration, API requests, and output formatting that command handlers can build on.
