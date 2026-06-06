# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.6] - 2026-06-05

### Changed
- cron 任务触发时注入的消息用 `<cron-reminder>...</cron-reminder>` 成对标签包裹，agent 可识别为定时提醒而非用户输入

### Changed
- README 重构：中英文分拆为独立文件，新增 README.zh-CN.md
- 调整文档结构：Install / Usage 前置，How it works 后移
- 简化使用说明：用户只需对话，Agent 自动维护任务文件
- cron_list 输出增加 prompt 列，便于查看任务内容
- AGENTS.md：移除过时的 cron_reload 提及

### Fixed
- README 中插件缓存路径修正为 `~/.cache/opencode/packages/`

## [0.1.5] - 2026-06-05

### Fixed
- cron 任务 ID 在 reload 后漂移导致删除失败（按 name 保留旧 ID）
- 删除 cron 任务后仍有僵尸触发（cancelled 标志位防护）
- cron_delete 正则删除脆弱，改用统一的 removeJobFromFile
- cron 注入时干扰用户正在输入的内容（改用 session.promptAsync 直接发送消息）
- cron_once 触发后未从内存 jobs 数组移除，cron_list 仍显示过期任务
- cron_create/cron_delete/cron_once 不必要地 stop/restart 所有已有任务（改为仅操作自身）

## [0.1.4] - 2026-06-05

### Removed
- 移除自动更新功能

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

