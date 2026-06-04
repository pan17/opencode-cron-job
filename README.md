# opencode-cron-job

[![npm version](https://img.shields.io/npm/v/opencode-cron-job)](https://www.npmjs.com/package/opencode-cron-job)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**OpenCode plugin** — schedule recurring prompts via a simple markdown file.  
**OpenCode 插件** — 通过简单的 markdown 文件定时执行 prompt。

> ⚠️ **Alpha** — This is an initial release and has not been extensively tested. Use at your own risk.  
> ⚠️ **Alpha** — 此为初版，未经充分测试，请谨慎使用。

---

## English

### Overview

`opencode-cron-job` is an OpenCode plugin that automatically reads cron tasks from `.cron-job/tasks.md` in your project root and injects prompts into your session on schedule. No MCP server, no HTTP API, no sidecar — runs entirely inside OpenCode.

### How it works

1. Create `.cron-job/tasks.md` in your project
2. Write tasks using simple markdown format
3. OpenCode loads the plugin automatically → reads the file → starts timers
4. When a timer fires, the prompt is injected into your session

### Install

```json
{
  "plugin": ["opencode-cron-job@latest"]
}
```

OpenCode auto-installs npm plugins on startup.

### Usage

Edit `.cron-job/tasks.md` to define your cron tasks. The plugin automatically loads them on startup.

To manage scheduled tasks, use natural language with the AI agent:

- "List all my cron jobs"
- "Run the code review task now"
- "Delete the backup task"
- "Reload the cron tasks from the file"

The agent calls the following tools internally — you don't need to use them directly:

| Tool | Description |
|------|-------------|
| `cron_create` | Create a cron job (name, schedule, prompt) |
| `cron_list` | List all scheduled tasks |
| `cron_run` | Run a task immediately |
| `cron_delete` | Delete a task |
| `cron_once` | Schedule a one-shot delay task |

### Task file format

Create `.cron-job/tasks.md`:

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

### Update

```bash
# Clear plugin cache and restart OpenCode
rm -rf ~/.cache/opencode/node_modules/opencode-cron-job
```

---

## 中文

### 概述

`opencode-cron-job` 是一个 OpenCode 插件，自动读取项目根目录下的 `.cron-job/tasks.md` 文件，按 cron 表达式定时向当前会话注入 prompt。无需 MCP 服务、无需 HTTP API、无需 sidecar 进程，完全在 OpenCode 内部运行。

### 工作方式

1. 在项目根目录创建 `.cron-job/tasks.md`
2. 用简单的 markdown 格式编写任务
3. OpenCode 启动时自动加载插件 → 读取文件 → 启动定时器
4. 到时间自动向会话注入 prompt

### 安装

```json
{
  "plugin": ["opencode-cron-job@latest"]
}
```

OpenCode 启动时自动安装 npm 插件。

### 使用方式

编辑 `.cron-job/tasks.md` 定义定时任务，插件启动时自动加载。

要管理任务，直接对 AI 说自然语言即可，例如：

- "列出所有周期任务"
- "立即执行一下代码检查"
- "把备份任务删掉"
- "重新加载任务文件"

Agent 内部会调用以下工具来完成，你不需要直接使用：

| 工具 | 说明 |
|------|------|
| `cron_create` | 创建周期任务（名称、cron 表达式、prompt） |
| `cron_list` | 列出所有任务 |
| `cron_run` | 立即执行一个任务 |
| `cron_delete` | 删除任务 |
| `cron_once` | 定时一次性延迟任务 |

### 任务文件格式

创建 `.cron-job/tasks.md`：

```markdown
# 周期任务

## 每日代码检查
- cron: 0 9 * * *
- prompt: 检查所有变更文件并生成报告

## 每小时备份
- cron: 0 */1 * * *
- prompt: 备份数据库
```

每个以 `##` 开头的区块为一个任务。支持字段：
- `cron` — 标准 5 段 cron 表达式（也支持含秒的 6 段格式）
- `prompt` — 定时触发时注入的 prompt 内容

### 更新

```bash
# 清除插件缓存后重启 OpenCode
rm -rf ~/.cache/opencode/node_modules/opencode-cron-job
```

---

## License / 许可证

MIT
