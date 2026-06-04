# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release
- OpenCode plugin that schedules recurring prompts via `.cron-job/tasks.md`
- Tools: `cron_create`, `cron_list`, `cron_run`, `cron_delete`
- Auto-load tasks on plugin initialization
- Prompt injection via `client.tui.appendPrompt()` + `client.tui.submitPrompt()`
