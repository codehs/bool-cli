bool-cli — CLI Spec & Agent Prompt

Goal

Build a CLI tool (bool-cli) that wraps the bool.com public REST API, letting developers manage Bools (projects), deploy files, and inspect versions from the terminal.

API Reference

Base URL: https://bool.com/api/
Auth: Bearer token via Authorization: Bearer bool_<token> header. Keys are created in the bool.com web UI.

Endpoints (all require auth unless noted)

Method
Path
Description
GET
/health/
Health check (no auth)
GET
/bools/
List all user's Bools
POST
/bools/create/
Create a Bool. Body: {"name": "..."}
GET
/bools/<slug>/
Get Bool detail + latest version info
PATCH
/bools/<slug>/
Update Bool. Body: any of {name, description, visibility}. Visibility: private|team|unlisted|public
DELETE
/bools/<slug>/
Soft-delete a Bool (204)
GET
/bools/<slug>/versions/
List version history (up to 50)
POST
/bools/<slug>/versions/
Deploy new files. Body: {"files": [{"filename": "...", "code": "..."}], "commit_message": "..."}
GET
/bools/<slug>/files/
Get file contents. Optional query param ?version_number=N

Response Shapes

Bool list item: {id, name, slug, description, visibility, created_at, updated_at, url}
Bool detail: same + latest_version: {id, version_number, file_count, commit_message, created_at}
Create Bool response: {id, name, slug, url, created_at}
Version list item: {id, version_number, file_count, commit_message, created_at, created_by_type, file_list}
Create version response: {id, bool_id, version_number, file_count, commit_message, created_at}
Files response: {bool_slug, version_number, files: [{filename, code}]}
Errors: {"error": "message"} with appropriate HTTP status

---

CLI Design

Package: Python (or Node — pick one). Recommend Python + click + httpx to match the existing stack.

Config:

API key stored in ~/.config/bool-cli/config.toml or BOOL_API_KEY env var.
bool auth login — prompts for API key and saves it.
bool auth status — shows current auth + calls /health/.

Commands:

bool auth login              # Save API key
bool auth status             # Check auth + health

bool list                    # List all Bools (table: name, slug, visibility, updated_at)
bool create <name>           # Create a new Bool
bool info <slug>             # Show Bool details + latest version
bool update <slug> [--name] [--description] [--visibility]
bool delete <slug>           # Soft-delete (with confirmation prompt)

bool versions <slug>         # List version history (table)
bool deploy <slug> [dir]     # Read local files from dir (default: .), deploy as new version
                             #   --message "commit message"
                             #   --exclude pattern (repeatable, default: .git, node_modules, __pycache__)
bool pull <slug> [dir]       # Download files to dir (default: ./<slug>/)
                             #   --version N (default: latest)

bool open <slug>             # Open editor URL in browser

Key Behaviors:

bool deploy recursively reads a local directory, builds the [{filename, code}] payload (relative paths), and POSTs to /bools/<slug>/versions/. Skip binary files. Respect .boolignore if present (gitignore syntax).
bool pull fetches files from the API and writes them to disk, creating subdirectories as needed.
All commands output human-readable tables/text by default, with --json flag for machine-readable output.
Error handling: surface API error messages clearly, use non-zero exit codes on failure.
Use rich for pretty terminal output (tables, spinners, colors).

Project Structure:

bool-cli/
├── pyproject.toml           # Package config, entry point: bool
├── src/
│   └── bool_cli/
│       ├── __init__.py
│       ├── cli.py           # Click group + command definitions
│       ├── client.py        # API client class (httpx-based)
│       ├── config.py        # Config file + env var loading
│       ├── commands/
│       │   ├── auth.py
│       │   ├── bools.py     # list, create, info, update, delete, open
│       │   ├── versions.py  # versions, deploy, pull
│       │   └── __init__.py
│       └── utils.py         # File reading, ignore patterns, output formatting
├── tests/
│   ├── test_client.py
│   ├── test_commands.py
│   └── conftest.py
└── README.md

Testing: Use pytest + respx (httpx mock) for unit tests against known API responses. No live API calls in tests.

Out of scope (v1): File uploads (images), credit/usage commands, watch mode, init-from-template.