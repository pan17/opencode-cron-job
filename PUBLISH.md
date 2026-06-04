# 发布指南

## 发布前检查

### 检查 `package.json` 版本号

```json
{
  "version": "0.1.0"
}
```

确保版本号符合语义化版本规范。

### 检查 CHANGELOG.md 是否需要同步

CHANGELOG.md 是 GitHub Release Notes 的数据源：

- **每次发版前**：在 `[Unreleased]` 下方写好本次版本的变更说明
- **格式**：遵循 [Keep a Changelog](https://keepachangelog.com/) 规范，分 `Added` / `Changed` / `Fixed` / `Removed` 等分类
- **日期**：格式为 `YYYY-MM-DD`

### 检查 README.md 是否需要同步

- **功能增减**或**行为变化**时需要同步更新中英文说明
- 纯 bug 修复不需要更新

### 检查 AGENTS.md 是否需要同步

- **架构变更**、**工具变更**（新增/删除工具）时需要更新
- Bug 修复或内部重构不需要更新

---

## 发布流程

### 1. 更新 CHANGELOG.md（必做）

将 `[Unreleased]` 改为版本号和日期：

```markdown
## [0.1.0] - 2026-06-04

### Added
- 新增功能...
```

### 2. 更新版本号

编辑 `package.json` 中的 `version` 字段。

### 3. 提交代码并推送 Tag

> ⚠️ 执行前先向用户发送消息确认（已完成以上检查和修改），获得确认后才能执行。

```bash
git add -A
git commit -m "release: v0.1.0"
git tag v0.1.0
git push origin main --tags
```

> push 不会自动推送 tags，必须执行 `git push origin --tags` 或 `git push origin v0.1.0`。

### 4. 自动构建与发布

推送 tag 后，GitHub Actions 自动触发 `.github/workflows/release.yml`：

1. **`publish-npm`** — 安装依赖 → 构建 → 发布到 npm
2. **`release`** — 自动创建带 Release Notes 的 GitHub Release

> **前置条件**：在 GitHub 仓库 Settings → Secrets and variables → Actions 中配置 `NPM` secret，值为 npm Automation Token。

### 5. 检查结果

- 确认 npm 包已更新：`npm view opencode-cron-job`
- 确认 GitHub Release 已创建
