#!/usr/bin/env bash
# Mac mini setup script for fmp-university-outreach.
# Run from the repo root after `git clone`.
#
#   ./setup.sh
#
# What this does:
#   1. Installs MCP server dependencies and builds the TypeScript output.
#   2. Copies the two skills (university-outreach, fmp-brand-guidelines)
#      into Claude's user skills directory.
#   3. Copies the scheduled task SKILL.md into Claude's scheduled tasks
#      directory.
#   4. Prints the final manual steps (config edit + schedule registration).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$HOME/Documents/Claude/Skills"
SCHEDULED_DIR="$HOME/Documents/Claude/Scheduled"
CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

echo "==> 1. Building the FMP MCP server"
cd "$REPO_ROOT/fmp-mcp-server"
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is not installed. Install Node 18+ first (https://nodejs.org)."
  exit 1
fi
npm install
npm run build
echo "    Built to: $REPO_ROOT/fmp-mcp-server/dist/index.js"

echo "==> 2. Installing skills into $SKILLS_DIR"
mkdir -p "$SKILLS_DIR"
rm -rf "$SKILLS_DIR/university-outreach" "$SKILLS_DIR/fmp-brand-guidelines"
cp -R "$REPO_ROOT/skills/university-outreach"   "$SKILLS_DIR/university-outreach"
cp -R "$REPO_ROOT/skills/fmp-brand-guidelines"  "$SKILLS_DIR/fmp-brand-guidelines"
echo "    Installed: university-outreach, fmp-brand-guidelines"

echo "==> 3. Installing scheduled task into $SCHEDULED_DIR"
mkdir -p "$SCHEDULED_DIR"
rm -rf "$SCHEDULED_DIR/university-outreach-daily"
cp -R "$REPO_ROOT/scheduled-tasks/university-outreach-daily" "$SCHEDULED_DIR/university-outreach-daily"
echo "    Installed: university-outreach-daily"

cat <<EOF

==> Done with file setup. A couple of manual steps remain:

1. Edit your Claude desktop config to register the MCP server:
   $CONFIG_PATH

   Add (or merge) this block:

   {
     "mcpServers": {
       "fmp": {
         "command": "node",
         "args": ["$REPO_ROOT/fmp-mcp-server/dist/index.js"],
         "env": {
           "SALESMATE_SESSION_KEY": "paste-session-key-here",
           "SALESMATE_WORKSPACE": "findmyplace"
         }
       }
     }
   }

   Then restart the Claude desktop app so it picks up the new server.

2. Register the scheduled task. Open Claude and ask:

   "Register a scheduled task using the SKILL.md at $SCHEDULED_DIR/university-outreach-daily/SKILL.md
    to run at 2:00 AM every weekday (cron: 0 2 * * 1-5)."

3. Verify it's wired up:

   "List my scheduled tasks."
   "Look up a deal in Salesmate."  (smoke test for the MCP server)

EOF
