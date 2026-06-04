# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.4] - 2026-06-05

### Changed
- 自动更新逻辑优化（测试验证）

## [0.1.3] - 2026-06-05

### Added
- `cron_once` 工具：支持一次性延迟任务，格式 `5m`、`30s`、`2h`、`1d`

### Fixed
- 插件导出格式改为默认导出（v1 plugin format），修复 OpenCode npm 插件加载问题

## [0.1.2] - 2026-06-04

### Added
- 自动更新：启动时检查 npm 最新版本，自动下载替换缓存，重启即可

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

