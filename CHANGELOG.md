# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-06-04

### Fixed
- npm 包缺少 `dist/` 目录导致插件无法加载（`.gitignore` 排除了构建产物）

## [0.1.0] - 2026-06-04

### Added

- Initial release
- OpenCode plugin that schedules recurring prompts via `.cron-job/tasks.md`
- Tools: `cron_create`, `cron_list`, `cron_run`, `cron_delete`
- Auto-load tasks on plugin initialization
- Prompt injection via `client.tui.appendPrompt()` + `client.tui.submitPrompt()`

