# opencode-cron-job

[![npm version](https://img.shields.io/npm/v/opencode-cron-job)](https://www.npmjs.com/package/opencode-cron-job)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**OpenCode plugin** — schedule recurring prompts via a simple markdown file.

[中文文档](./README.zh-CN.md)

> ⚠️ **Alpha** — Tested on Windows with terminal, desktop, and ACP server. Use at your own risk.

---

## Install

Add to your OpenCode config:

```json
{
  "plugin": ["opencode-cron-job@latest"]
}
```

OpenCode auto-installs npm plugins on startup — no manual download needed.

## Usage

Just tell the AI agent what you need in natural language. The agent manages `.cron-job/tasks.md` for you through built-in tools:

- "Remind me to write a daily report at 9am"
- "Run a code review every Friday at 3pm"
- "Check server health every 30 minutes"
- "List all my cron jobs"

The agent calls the following tools internally — you don't need to use them directly:

| Tool | Description |
|------|-------------|
| `cron_create` | Create a cron job (name, schedule, prompt) |
| `cron_list` | List all scheduled tasks |
| `cron_run` | Run a task immediately |
| `cron_delete` | Delete a task |
| `cron_once` | Schedule a one-shot delay task |

## How it works

1. **Plugin starts** → reads `.cron-job/tasks.md`, parses each `##` task block
2. **Schedules** → registers a `node-cron` timer for each valid cron expression
3. **Timer fires** → plugin finds the most recent session in the current workspace via API
4. **Injects prompt** → sends the prompt directly into the session — no TUI input, no interruption

## Task file format

`.cron-job/tasks.md` is auto-managed by the agent, but here's the format for reference:

```markdown
# Cron Tasks

## Daily Code Review
- cron: 0 9 * * *
- prompt: Review all changed files and generate a report

## Hourly Backup
- cron: 0 */1 * * *
- prompt: Backup the database
```

Each section starting with `##` is a task. Supported fields:
- `cron` — standard 5-field cron expression (supports 6-field with seconds)
- `prompt` — the prompt text to inject when the timer fires

## Update

```bash
# Clear plugin cache and restart OpenCode
rm -rf ~/.cache/opencode/node_modules/opencode-cron-job
```

## License

MIT
