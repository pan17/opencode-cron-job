# opencode-cron-job

[![npm version](https://img.shields.io/npm/v/opencode-cron-job)](https://www.npmjs.com/package/opencode-cron-job)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**OpenCode 插件** — 通过简单的 markdown 文件定时执行 prompt。

[English](./README.md)

> ⚠️ **Alpha** — 已在 Windows 上经过简单测试，支持终端版、桌面版和 ACP 服务器。

---

## 安装

在 OpenCode 配置中添加：

```json
{
  "plugin": ["opencode-cron-job@latest"]
}
```

OpenCode 启动时自动安装 npm 插件，无需手动下载。

## 使用方式

直接对 AI 说自然语言即可，Agent 会自动维护 `.cron-job/tasks.md`：

- "每天早上9点提醒我写日报"
- "每周五下午3点执行代码审查"
- "每30分钟检查一次服务器状态"
- "列出所有周期任务"

Agent 内部会调用以下工具来完成，你不需要直接使用：

| 工具 | 说明 |
|------|------|
| `cron_create` | 创建周期任务（名称、cron 表达式、prompt） |
| `cron_list` | 列出所有任务 |
| `cron_run` | 立即执行一个任务 |
| `cron_delete` | 删除任务 |
| `cron_once` | 定时一次性延迟任务 |

## 工作原理

1. **插件启动** → 读取 `.cron-job/tasks.md`，解析每个 `##` 任务区块
2. **注册定时器** → 对每个有效的 cron 表达式调用 `node-cron` 注册定时任务
3. **定时触发** → 到时间后插件通过 API 找到当前工作区最近的会话
4. **注入 prompt** → 直接把 prompt 发送到会话中，不经过 TUI 输入，不中断用户操作

## 任务文件格式

`.cron-job/tasks.md` 由 Agent 自动维护，参考格式如下：

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

## 更新

```bash
# 清除插件缓存后重启 OpenCode
rm -rf ~/.cache/opencode/node_modules/opencode-cron-job
```

## 许可证

MIT
