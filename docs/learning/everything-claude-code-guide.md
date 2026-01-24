# Everything Claude Code 插件完整指南

> 来自 Anthropic 黑客马拉松获奖者的 Claude Code 最佳实践配置集合

本文档整理了 `everything-claude-code` 插件的核心概念、组件架构和最佳实践，帮助高效使用 Claude Code 进行开发工作。

---

## 第一部分：插件概述与架构

### 1.1 背景介绍

Everything Claude Code 是一个由 Anthropic × Forum Ventures 黑客马拉松获奖者 Affaan Mustafa 开发的 Claude Code 插件，经过 10+ 个月的实际生产环境使用打磨而成。

**项目地址**: [github.com/affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)

### 1.2 核心组件统计

| 组件类型 | 数量 | 说明 |
|---------|------|------|
| Agents（代理） | 9 | 专门化的子代理用于任务委派 |
| Skills（技能） | 11 | 工作流定义和领域知识 |
| Commands（命令） | 17 | 斜杠命令快速执行 |
| Rules（规则） | 8 | 始终遵循的指导原则 |
| Hooks（钩子） | 12+ | 基于触发器的自动化 |

### 1.3 架构设计哲学

```
质量第一 → 测试先行 → 自动化 → 专业化分工
```

核心理念：
- **质量第一**：代码审查、安全审查作为强制步骤
- **测试先行**：TDD 工作流，80%+ 覆盖率要求
- **自动化**：Hooks 自动触发格式化、类型检查、警告
- **专业化分工**：不同代理处理不同类型任务

### 1.4 五层组件关系图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Rules（规则层）                              │
│   security.md │ coding-style.md │ testing.md │ git-workflow.md     │
│                     始终强制执行的基础约束                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Skills（技能层）                              │
│   coding-standards │ backend-patterns │ tdd-workflow │ ...         │
│                     可复用的工作流定义                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Agents（代理层）                              │
│  planner │ architect │ tdd-guide │ code-reviewer │ security-...    │
│                     专门化的任务执行者                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Commands（命令层）                             │
│    /tdd │ /plan │ /e2e │ /code-review │ /build-fix │ /learn ...    │
│                     用户交互的快捷入口                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Hooks（钩子层）                              │
│  PreToolUse │ PostToolUse │ SessionStart │ SessionEnd │ Stop       │
│                     自动触发的后台守护                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 第二部分：入门指南

### 2.1 核心理念

1. **质量第一**：代码审查和安全审查是强制步骤
2. **测试先行**：TDD 工作流，要求 80%+ 测试覆盖率
3. **自动化**：Hooks 自动触发格式化、类型检查、警告提示
4. **专业化分工**：不同代理处理不同类型的任务

### 2.2 安装配置

#### 方式一：作为插件安装（推荐）

```bash
# 添加市场源
/plugin marketplace add affaan-m/everything-claude-code

# 安装插件
/plugin install everything-claude-code@everything-claude-code
```

或直接编辑 `~/.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "everything-claude-code": {
      "source": {
        "source": "github",
        "repo": "affaan-m/everything-claude-code"
      }
    }
  },
  "enabledPlugins": {
    "everything-claude-code@everything-claude-code": true
  }
}
```

#### 方式二：手动安装

```bash
# 克隆仓库
git clone https://github.com/affaan-m/everything-claude-code.git

# 复制组件
cp everything-claude-code/agents/*.md ~/.claude/agents/
cp everything-claude-code/rules/*.md ~/.claude/rules/
cp everything-claude-code/commands/*.md ~/.claude/commands/
cp -r everything-claude-code/skills/* ~/.claude/skills/
```

### 2.3 配置文件位置说明

| 配置类型 | 位置 | 作用 |
|---------|------|------|
| 全局设置 | `~/.claude/settings.json` | Hooks、全局配置 |
| 项目配置 | `项目根目录/CLAUDE.md` | 项目特定指令 |
| 用户配置 | `~/.claude/CLAUDE.md` | 用户级别偏好 |
| MCP 配置 | `~/.claude.json` | MCP 服务器配置 |

### 2.4 Hooks 配置示例

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "tool == \"Edit\" || tool == \"Write\"",
        "hooks": [{
          "type": "command",
          "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/hooks/suggest-compact.js\""
        }],
        "description": "在逻辑间隔建议手动压缩"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "tool == \"Edit\" && tool_input.file_path matches \"\\\\.(ts|tsx)$\"",
        "hooks": [{
          "type": "command",
          "command": "npx prettier --write \"$file_path\""
        }],
        "description": "编辑后自动格式化 TypeScript 文件"
      }
    ],
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [{
          "type": "command",
          "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/hooks/session-start.js\""
        }],
        "description": "新会话时加载之前的上下文"
      }
    ]
  }
}
```

### 2.5 上下文窗口管理黄金法则

> **关键**：不要同时启用所有 MCP。你的 200k 上下文窗口可能因启用过多工具而缩减到 70k。

**经验法则**：
- 配置 20-30 个 MCP 服务器
- 每个项目启用不超过 10 个
- 活跃工具不超过 80 个

使用 `disabledMcpServers` 在项目配置中禁用不需要的 MCP。

---

## 第三部分：五大核心组件详解

### 3.1 Agents（代理）

代理是具有有限范围的子代理，处理委派的任务。

#### 代理定义格式

```markdown
---
name: code-reviewer
description: 审查代码的质量、安全性和可维护性
tools: Read, Grep, Glob, Bash
model: opus
---

你是一位资深代码审查员...
```

#### 可用代理列表

| 代理名称 | 用途 | 推荐模型 |
|---------|------|---------|
| `planner` | 功能实现规划 | sonnet |
| `architect` | 系统设计决策 | opus |
| `tdd-guide` | 测试驱动开发 | sonnet |
| `code-reviewer` | 质量和安全审查 | opus |
| `security-reviewer` | 漏洞分析 | opus |
| `build-error-resolver` | 构建错误修复 | haiku |
| `e2e-runner` | Playwright E2E 测试 | sonnet |
| `refactor-cleaner` | 死代码清理 | haiku |
| `doc-updater` | 文档同步 | haiku |

### 3.2 Skills（技能）

技能是由命令或代理调用的工作流定义。

#### 技能结构

```
skills/
├── coding-standards/    # 语言最佳实践
├── backend-patterns/    # API、数据库、缓存模式
├── frontend-patterns/   # React、Next.js 模式
├── continuous-learning/ # 从会话自动提取模式
├── strategic-compact/   # 手动压缩建议
├── tdd-workflow/        # TDD 方法论
├── security-review/     # 安全检查清单
├── eval-harness/        # 验证循环评估
└── verification-loop/   # 持续验证
```

#### 技能定义示例（TDD 工作流）

```markdown
# TDD Workflow

1. 首先定义接口
2. 编写失败的测试（RED）
3. 实现最小代码（GREEN）
4. 重构（IMPROVE）
5. 验证 80%+ 覆盖率
```

### 3.3 Commands（命令）

斜杠命令提供快速执行入口。

#### 命令速查表

| 命令 | 功能 | 触发代理 |
|------|------|---------|
| `/tdd` | 测试驱动开发 | tdd-guide |
| `/plan` | 实现规划 | planner |
| `/e2e` | E2E 测试生成 | e2e-runner |
| `/code-review` | 质量审查 | code-reviewer |
| `/build-fix` | 修复构建错误 | build-error-resolver |
| `/refactor-clean` | 死代码移除 | refactor-cleaner |
| `/learn` | 提取模式 | - |
| `/checkpoint` | 保存验证状态 | - |
| `/verify` | 运行验证循环 | - |
| `/setup-pm` | 配置包管理器 | - |
| `/update-docs` | 更新文档 | doc-updater |
| `/update-codemaps` | 更新代码地图 | - |
| `/orchestrate` | 编排任务 | - |
| `/test-coverage` | 测试覆盖率 | - |
| `/eval` | 运行评估 | - |

### 3.4 Rules（规则）

规则是始终遵循的指导原则，保持模块化便于管理。

#### 规则文件结构

```
~/.claude/rules/
├── security.md      # 无硬编码密钥
├── coding-style.md  # 不变性、文件限制
├── testing.md       # TDD、覆盖率要求
├── git-workflow.md  # 提交格式、PR 流程
├── agents.md        # 何时委派给子代理
├── performance.md   # 模型选择、上下文管理
├── patterns.md      # 代码模式
└── hooks.md         # Hook 使用规范
```

### 3.5 Hooks（钩子）

Hooks 在工具事件上触发自动化操作。

#### Hook 类型

| Hook 类型 | 触发时机 | 典型用途 |
|-----------|---------|---------|
| `PreToolUse` | 工具执行前 | 阻止危险操作、提醒 |
| `PostToolUse` | 工具执行后 | 自动格式化、类型检查 |
| `SessionStart` | 会话开始时 | 加载上下文 |
| `SessionEnd` | 会话结束时 | 保存状态、提取模式 |
| `PreCompact` | 压缩前 | 保存状态 |
| `Stop` | 每次响应后 | 检查问题 |

#### Hook 配置示例

```json
{
  "matcher": "tool == \"Edit\" && tool_input.file_path matches \"\\\\.(ts|tsx|js|jsx)$\"",
  "hooks": [{
    "type": "command",
    "command": "#!/bin/bash\ngrep -n 'console\\.log' \"$file_path\" && echo '[Hook] 移除 console.log' >&2"
  }]
}
```

---

## 第四部分：Token 优化策略

### 4.1 问题分析：Token 消耗的隐藏成本

Claude Code 的 200k 上下文窗口看似充裕，但以下因素会显著消耗：

| 消耗来源 | 估计 Token 数 |
|---------|-------------|
| 系统提示词 | 10-20k |
| MCP 工具定义 | 每个工具 500-2000 |
| 对话历史 | 累积增长 |
| 文件内容 | 按读取量计 |

**结果**：启用 30+ MCP 后，实际可用上下文可能只剩 70k。

### 4.2 模型选择策略

```
┌─────────────────────────────────────────────────────────────────┐
│                      模型选择决策树                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  任务类型                          推荐模型                      │
│  ────────                          ────────                      │
│  轻量代理频繁调用                  Haiku 4.5 (3x 成本节省)       │
│  配对编程和代码生成                Haiku 4.5                     │
│  多代理系统中的工作者              Haiku 4.5                     │
│                                                                 │
│  主要开发工作                      Sonnet 4.5 (最佳编码模型)     │
│  编排多代理工作流                  Sonnet 4.5                    │
│  复杂编码任务                      Sonnet 4.5                    │
│                                                                 │
│  复杂架构决策                      Opus 4.5 (最深推理)           │
│  最高推理要求                      Opus 4.5                      │
│  研究和分析任务                    Opus 4.5                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 MCP 服务器管理黄金法则

**20-10-80 规则**：
- 配置约 20-30 个 MCP 服务器
- 每个项目启用不超过 10 个
- 活跃工具总数不超过 80 个

**项目级禁用配置**：

```json
// .claude/settings.local.json
{
  "disabledMcpServers": [
    "unnecessary-mcp-1",
    "unnecessary-mcp-2"
  ]
}
```

### 4.4 智能压缩策略（Strategic Compact）

自动压缩的问题：
- 在任意点触发，常在任务中途
- 不感知逻辑任务边界
- 可能中断复杂的多步操作

**战略性压缩时机**：

| 时机 | 说明 |
|------|------|
| 探索后、执行前 | 压缩研究上下文，保留实现计划 |
| 完成里程碑后 | 为下一阶段重新开始 |
| 主要上下文切换前 | 在不同任务前清除探索上下文 |

**配置示例**：

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "tool == \"Edit\" || tool == \"Write\"",
      "hooks": [{
        "type": "command",
        "command": "~/.claude/skills/strategic-compact/suggest-compact.sh"
      }]
    }]
  }
}
```

环境变量配置：
- `COMPACT_THRESHOLD` - 首次建议前的工具调用数（默认：50）

### 4.5 上下文管理最佳实践

**上下文窗口使用建议**：

| 上下文使用率 | 适合的任务 |
|-------------|-----------|
| < 80% | 大规模重构、跨多文件实现、复杂调试 |
| > 80% | 单文件编辑、独立工具创建、文档更新、简单修复 |

**避免最后 20% 上下文的任务**：
- 大规模重构
- 跨多文件的功能实现
- 复杂交互调试

### 4.6 子代理分割策略

将复杂任务分解为独立子代理，每个子代理：
- 使用独立上下文
- 专注于单一职责
- 结果汇总回主代理

```
主代理（Orchestrator）
    │
    ├── 子代理 1: 代码分析 (haiku)
    ├── 子代理 2: 测试编写 (haiku)
    ├── 子代理 3: 文档更新 (haiku)
    └── 子代理 4: 安全审查 (opus)
```

### 4.7 记忆持久化策略

使用 Hooks 在会话间保持状态：

```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node scripts/hooks/session-start.js"
      }],
      "description": "新会话时加载之前的上下文"
    }],
    "SessionEnd": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node scripts/hooks/session-end.js"
      }],
      "description": "会话结束时保存状态"
    }]
  }
}
```

---

## 第五部分：MCP Router 模式

### 5.1 传统 MCP 加载的问题

每个启用的 MCP 服务器都会：
1. 注入工具定义到系统提示词
2. 占用 500-2000 tokens/工具
3. 增加 Claude 的决策负担

**启用 30 个 MCP 的后果**：
- 系统提示词膨胀 50k+ tokens
- 实际可用上下文锐减
- 工具选择延迟增加

### 5.2 解决方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Tool Search** | 官方支持，自动化 | 需要搜索步骤 |
| **Lazy MCP** | 完全延迟加载 | 需要第三方配置 |
| **McPick** | 手动精确控制 | 需要人工干预 |

### 5.3 Tool Search 官方方案

Claude Code 内置的工具发现机制：

```
用户请求 → Claude 识别需要工具
    ↓
调用 ToolSearch 搜索相关工具
    ↓
返回匹配工具定义
    ↓
Claude 使用工具完成任务
```

**使用方式**：
1. 关键词搜索：`"slack message"` - 搜索 slack 消息相关工具
2. 直接选择：`"select:mcp__slack__read_channel"` - 选择特定工具

### 5.4 Lazy MCP 高级配置

延迟加载 MCP 服务器，仅在需要时激活：

```json
// ~/.claude.json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["@anthropic/mcp-slack"],
      "lazy": true,
      "activationKeywords": ["slack", "message", "channel"]
    }
  }
}
```

### 5.5 McPick 手动管理方案

使用 McPick 手动选择需要的 MCP：

```bash
# 交互式选择
mcpick select

# 预设配置
mcpick use frontend  # 加载前端相关 MCP
mcpick use backend   # 加载后端相关 MCP
```

### 5.6 组合策略实践指南

**推荐配置**：

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP 管理分层策略                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  常用 MCP（始终启用）     5-8 个                                │
│  - filesystem                                                   │
│  - git                                                          │
│  - context7（文档查询）                                         │
│                                                                 │
│  项目相关 MCP（按需启用）  3-5 个                               │
│  - 数据库 MCP                                                   │
│  - 云服务 MCP                                                   │
│                                                                 │
│  工具类 MCP（延迟加载）    通过 Tool Search                     │
│  - slack                                                        │
│  - notion                                                       │
│  - 其他第三方服务                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 附录

### A. 学习资源

| 资源 | 描述 | 链接 |
|------|------|------|
| Shorthand Guide | 设置、基础、哲学（**先读这个**） | [Twitter](https://x.com/affaanmustafa/status/2012378465664745795) |
| Longform Guide | Token 优化、记忆持久化、评估、并行化 | [Twitter](https://x.com/affaanmustafa/status/2014040193557471352) |
| GitHub Repo | 源代码和最新更新 | [GitHub](https://github.com/affaan-m/everything-claude-code) |

### B. 快速参考卡

```
常用命令：
  /tdd          - 启动测试驱动开发
  /plan         - 规划功能实现
  /code-review  - 运行代码审查
  /build-fix    - 修复构建错误

模型选择：
  轻量任务 → Haiku (成本 ↓)
  一般开发 → Sonnet (平衡)
  复杂推理 → Opus (质量 ↑)

上下文管理：
  /compact      - 手动压缩上下文
  /checkpoint   - 保存当前状态
```

### C. 故障排除

| 问题 | 解决方案 |
|------|---------|
| 上下文不足 | 禁用不必要的 MCP，使用 `/compact` |
| Hook 不触发 | 检查 `settings.json` 语法，验证 matcher |
| 代理超时 | 使用更小的模型（haiku）处理轻量任务 |
| 构建失败 | 运行 `/build-fix` 或查看 build-error-resolver |

---

*文档生成日期：2026-01-25*
*基于 everything-claude-code 插件版本分析*
