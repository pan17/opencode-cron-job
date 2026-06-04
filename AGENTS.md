# opencode-cron-job

## Build

```bash
npm run build        # tsc → dist/index.js
npm publish          # builds + publishes to npm
```

After build, copy to plugins dir for local testing:
```bash
cp dist/index.js .opencode/plugins/
```

## Architecture

Single-file TypeScript OpenCode plugin (`src/index.ts`). Exports `CronPlugin` which is auto-discovered when installed as an npm plugin or placed in `.opencode/plugins/`.

### Flow

1. Plugin initializes → reads `.cron-job/tasks.md` from `directory` (project root)
2. Parses `##` sections → extracts `- cron:` and `- prompt:` fields
3. Schedules each valid cron expression via `node-cron`
4. On timer fire → `client.tui.appendPrompt()` → `client.tui.submitPrompt()`
5. Registers 4 tools: `cron_create`, `cron_list`, `cron_run`, `cron_delete`

### Key constraints

- NOT an MCP server — runs inside OpenCode process (no HTTP API, no sidecar)
- Tools are defined with `tool()` helper from `@opencode-ai/plugin`, not raw objects
- Prompt injection uses `client.tui.*` methods (TUI mode only)
- Cron uses 5-field expressions by default, 6-field if seconds are specified (`*/30 * * * * *`)
- Jobs are in-memory and volatile — reload via `cron_reload` after editing `.cron-job/tasks.md`
- `@opencode-ai/plugin` is a peer dependency provided by OpenCode runtime
- Plugin auto-updates via npm `@latest` tag are unreliable — bump pinned version in config or clear cache manually

### Published API

```json
{
  "plugin": ["opencode-cron-job@latest"]
}
```

## Gotchas

- `node-cron` v3 accepts 6-field format (seconds included)
- Plugin runs inside Bun/OpenCode runtime — use `import` syntax, not `require`
- Build artifact `.opencode/plugins/index.js` is copied from `dist/` — both gitignored
- `.opencode/package.json` has its own `node_modules/` for local plugin dev — separate from root
