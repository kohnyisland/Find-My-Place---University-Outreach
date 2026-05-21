# fmp-university-outreach

Everything needed to run the **university-outreach-daily** scheduled task on a second Mac. Built to be cloned onto a Mac mini, set up once, and left alone.

## What's in here

```
fmp-university-outreach/
├── fmp-mcp-server/                       slim MCP server, Salesmate only
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── utils.ts
│       └── tools/salesmate.ts
├── skills/
│   ├── university-outreach/              the workflow skill (SKILL.md + references)
│   └── fmp-brand-guidelines/             voice and visual brand reference (used while drafting)
├── scheduled-tasks/
│   └── university-outreach-daily/        the prompt that fires on schedule
│       └── SKILL.md
├── claude_desktop_config.example.json    MCP server config snippet
├── .env.example                          env var reference
├── setup.sh                              one-shot installer
└── README.md
```

## What the daily task does

Every weekday at 2:00 AM the task wakes Claude, pulls deals from the **Universities** pipeline sitting in the **Email Automation** stage, researches each school with web search, drafts a cold email to the VP of Student Affairs, writes the contact records and email activity back into Salesmate, and advances the deal to **Outreach Started** so it doesn't reprocess tomorrow.

The full logic is in `scheduled-tasks/university-outreach-daily/SKILL.md`, which leans on the `university-outreach` skill for research and drafting prompts and on `fmp-brand-guidelines` for voice.

## What got stripped out

The original FMP MCP server bundled Google Sheets, Docs, Drive, GA4, Search Console, and Profound AI. None of those are touched by the daily outreach task, so this slim build keeps **only Salesmate**. Smaller surface area, fewer secrets to migrate, fewer ways for it to break.

The task also does not use Granola, since outreach is fully driven by the Salesmate pipeline stage.

## Prerequisites

On the Mac mini:

1. Node.js 18 or newer (`node -v` to check, install from nodejs.org if missing).
2. The Claude desktop app installed and signed in.
3. A Salesmate Session Key. Get it from Salesmate > My Account > Access Key.

## Setup

```bash
git clone <your-repo-url> fmp-university-outreach
cd fmp-university-outreach
./setup.sh
```

`setup.sh` does three things:

1. Runs `npm install` and `npm run build` in `fmp-mcp-server/`.
2. Copies `skills/university-outreach` and `skills/fmp-brand-guidelines` to `~/Documents/Claude/Skills/`.
3. Copies `scheduled-tasks/university-outreach-daily` to `~/Documents/Claude/Scheduled/`.

Then there are two manual steps the script prints at the end:

### Step A: register the MCP server in your Claude config

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (create it if it doesn't exist) and add an `fmp` entry under `mcpServers`. See `claude_desktop_config.example.json` for the exact shape. The `args` path must be the absolute path to the built `dist/index.js`.

Put your real Salesmate Session Key in the `env` block. The MCP server reads it from there at launch and also hot-refreshes from this same file if the key expires.

Restart Claude so it picks up the new MCP server.

### Step B: register the scheduled task

Open Claude on the Mac mini and ask:

> Register a scheduled task using the SKILL.md at `~/Documents/Claude/Scheduled/university-outreach-daily/SKILL.md` to run at 2:00 AM every weekday. Cron expression: `0 2 * * 1-5`.

That's the cron for **2:00 AM, Monday through Friday** in the Mac's local timezone. If the mini is in Pacific time, that's 2 AM PT.

## Smoke tests

After setup, ask Claude:

- "List my scheduled tasks." Confirms the task is registered with the right cron.
- "Look up a deal in Salesmate." Confirms the MCP server is healthy.
- "Run the university outreach now." Manually triggers the workflow (use during the day to test before the first 2 AM run).

## Keeping the Salesmate session key fresh

Salesmate session keys expire periodically (a few weeks). When they do, the MCP server auto-retries by re-reading `claude_desktop_config.json`. So the only thing you need to do is paste a fresh key into the `env.SALESMATE_SESSION_KEY` field in that file. No restart, no rebuild.

## Mac mini specifics

For this to run unattended at 2 AM you need three things to be true:

1. The Mac mini is powered on at 2 AM. (Set Energy Saver to "Never sleep" or schedule a wake every weekday at 1:55 AM.)
2. The Claude desktop app is running, with you logged in. Add Claude to "Login Items" in System Settings > General > Login Items so it auto-launches after a reboot.
3. The user account is logged in (not at the login screen). If the Mac mini ever reboots, log back in.

If any of those is off, the scheduled task silently won't fire.

## Updating

Pull the latest from the repo and re-run `./setup.sh`. The script wipes and re-copies the skill and task folders, so any local edits to those files in `~/Documents/Claude/` will be overwritten. Keep edits in the repo and re-run setup.

## Troubleshooting

- **MCP server fails to start**: check Claude's log file (Help > Open Log Folder). Most common cause is a missing `SALESMATE_WORKSPACE` or a bad path in `args`.
- **Auth errors at 2 AM**: open the Mac mini, ask Claude to "run the university outreach now," and check the error. If it's a session key issue, paste a fresh key into the config.
- **The task fires but does nothing**: that's the expected output when no deals are in the Email Automation stage. Look for "Nothing in the queue this morning" in the run output.
- **Stage advance failed but deal stayed in Email Automation**: by design. The deal will be retried on the next run. Check the activity log on the deal to see how far it got.

## License

Private to Find My Place.
