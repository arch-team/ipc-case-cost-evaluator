# Feature Specification: AWS CDK Serverless 基础设施部署

**Feature Branch**: `003-aws-cdk-infra`
**Created**: 2026-01-27
**Status**: Draft
**Input**: User description: "我需要给当前的这个项目提供一个部署的基础设施即代码的项目，采用AWS CDK实现这个IaC，项目的前后端部署采用AWS Serverless服务"

## Clarifications

### Session 2026-01-27

- Q: DynamoDB 容量模式选择？ → A: 按需模式 (On-Demand) - 自动扩缩容，按请求付费
- Q: 可观测性需求级别？ → A: 最小化 - 仅依赖 AWS 默认日志，不额外配置监控
- Q: 销毁时 DynamoDB 数据保留策略？ → A: 按环境区分 - dev/test 环境删除，prod 环境保留
- Q: CDK 项目存放位置？ → A: 当前仓库子目录 (如 `infra/` 或 `cdk/`)
- Q: API Gateway 类型选择？ → A: HTTP API - 更低成本、更低延迟
- Q: 默认部署区域？ → A: us-east-1（用户指定）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 一键部署完整应用栈 (Priority: P1)

作为 DevOps 工程师，我希望能够通过单一命令将 IPC Cost Evaluator 的前端和后端完整部署到 AWS 云环境中，以便快速搭建生产可用的应用环境。

**Why this priority**: 这是 IaC 项目的核心价值 —— 实现从零到完整运行环境的自动化部署，没有这个能力其他功能都无法验证。

**Independent Test**: 在新的 AWS 账户中执行部署命令后，能够通过生成的 URL 访问前端页面，并且前端能正常调用后端 API 返回数据。

**Acceptance Scenarios**:

1. **Given** 已配置 AWS 凭证和 CDK 环境, **When** 执行 CDK 部署命令, **Then** 系统在指定 AWS 区域创建完整的前后端资源栈
2. **Given** 部署成功完成, **When** 访问输出的前端 URL, **Then** 能够正常加载应用页面且页面功能正常
3. **Given** 部署成功完成, **When** 调用后端 API 端点, **Then** API 正常响应并返回预期数据

---

### User Story 2 - 多环境支持部署 (Priority: P2)

作为 DevOps 工程师，我希望能够部署多个独立的环境实例（如开发、测试、生产），以便支持标准的软件开发生命周期。

**Why this priority**: 多环境隔离是企业级部署的基本要求，保证开发、测试活动不影响生产环境。

**Independent Test**: 使用不同的环境标识符执行部署，验证创建的资源相互独立且可以同时运行。

**Acceptance Scenarios**:

1. **Given** CDK 项目已就绪, **When** 使用 "dev" 环境标识执行部署, **Then** 创建带有 "dev" 前缀的独立资源栈
2. **Given** "dev" 环境已部署, **When** 使用 "prod" 环境标识再次部署, **Then** 创建独立的 "prod" 资源栈且不影响 "dev" 环境
3. **Given** 多个环境已部署, **When** 销毁某个环境, **Then** 只删除该环境的资源，其他环境不受影响

---

### User Story 3 - 资源栈销毁与清理 (Priority: P2)

作为 DevOps 工程师，我希望能够完整销毁已部署的资源栈，以便在不需要时释放云资源、避免产生费用。

**Why this priority**: 可逆性是 IaC 的核心优势之一，能够清理资源对于成本控制和环境管理至关重要。

**Independent Test**: 执行销毁命令后，验证 AWS 账户中对应资源栈的所有资源均已删除。

**Acceptance Scenarios**:

1. **Given** 某环境资源栈已部署, **When** 执行 CDK 销毁命令, **Then** 该环境的所有云资源被删除
2. **Given** dev/test 环境销毁命令执行中, **When** 遇到 DynamoDB 表, **Then** 表及数据一并删除
3. **Given** prod 环境销毁命令执行中, **When** 遇到 DynamoDB 表, **Then** 表被保留以防止数据丢失

---

### User Story 4 - 部署状态查看 (Priority: P3)

作为 DevOps 工程师，我希望能够查看当前已部署资源栈的状态和输出信息，以便监控和管理部署。

**Why this priority**: 运维可观测性是日常管理的基础需求，优先级低于核心部署功能。

**Independent Test**: 执行状态查看命令后，能够获取资源栈的当前状态、输出值（如 URL、ARN 等）。

**Acceptance Scenarios**:

1. **Given** 资源栈已部署, **When** 查询栈状态, **Then** 显示栈的健康状态和最近更新时间
2. **Given** 资源栈已部署, **When** 查询栈输出, **Then** 显示前端 URL、API 端点等关键信息

---

### User Story 5 - 增量更新部署 (Priority: P3)

作为 DevOps 工程师，我希望在代码或配置变更后能够仅更新变化的资源，以便实现快速迭代部署。

**Why this priority**: 增量更新提升部署效率，但 CDK 框架已内置此能力，实现复杂度低。

**Independent Test**: 修改某个配置参数后重新部署，验证只有相关资源被更新而非全部重建。

**Acceptance Scenarios**:

1. **Given** 资源栈已部署且代码有更新, **When** 重新执行部署命令, **Then** CDK 自动识别并仅更新变化的资源
2. **Given** 部署过程中, **When** 出现部署失败, **Then** 自动回滚到上一个稳定状态

---

### Edge Cases

- 当 AWS 账户配额不足时，部署应该明确报告哪些资源创建失败
- 当网络超时或 AWS 服务暂时不可用时，部署应该具备重试机制
- 当指定区域不支持某些服务时，应该在部署前给出明确警告
- 当销毁带有数据的存储资源时，应该有保护机制防止意外数据丢失

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 在当前仓库内提供独立的 CDK 子目录（如 `infra/`），包含完整的基础设施定义代码
- **FR-002**: 系统 MUST 将后端 FastAPI 应用部署为 AWS Lambda 函数，并通过 API Gateway (HTTP API) 暴露 HTTP 端点
- **FR-003**: 系统 MUST 将前端静态资源部署到 S3 存储桶，并通过 CloudFront 分发提供全球访问
- **FR-004**: 系统 MUST 配置 DynamoDB 表存储应用数据（用户、评估、分享）
- **FR-005**: 系统 MUST 支持通过环境变量或配置文件指定部署的目标区域
- **FR-006**: 系统 MUST 支持环境隔离，允许在同一账户部署多套独立环境
- **FR-007**: 系统 MUST 配置适当的 IAM 角色和策略，遵循最小权限原则
- **FR-008**: 系统 MUST 提供部署后的资源输出信息（前端 URL、API 端点、资源 ARN 等）
- **FR-009**: 系统 MUST 支持完整销毁已部署的资源栈
- **FR-010**: 系统 MUST 配置 CloudFront 到 API Gateway 的代理路由，使前端能够调用后端 API
- **FR-011**: 系统 MUST 配置 Lambda 函数的适当内存和超时设置以满足应用需求
- **FR-012**: 系统 MUST 配置 S3 存储桶的安全策略，禁止公开访问，仅允许通过 CloudFront 访问

### Key Entities

- **CDK Stack（CDK 栈）**: 代表一组相关 AWS 资源的逻辑集合，可独立部署和管理，包含环境标识、区域、资源定义
- **Lambda Function（Lambda 函数）**: 后端应用的运行载体，包含代码包、运行时配置、内存/超时设置、环境变量
- **API Gateway**: 后端 API 的入口网关，包含路由配置、CORS 设置、与 Lambda 的集成
- **S3 Bucket（S3 存储桶）**: 前端静态资源的存储位置，包含访问策略、生命周期配置
- **CloudFront Distribution**: 全球内容分发网络，包含源站配置（S3 + API Gateway）、缓存策略、HTTPS 配置
- **DynamoDB Tables**: 应用数据存储，包含表名、主键设计；采用按需容量模式 (On-Demand) 实现自动扩缩容
- **IAM Roles/Policies**: 服务间权限控制，包含 Lambda 执行角色、资源访问策略

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 新用户从克隆代码到完成首次部署的时间不超过 15 分钟（不含 AWS 账户设置）
- **SC-002**: 部署完成后，前端页面首次加载时间不超过 3 秒（在目标部署区域）
- **SC-003**: 部署完成后，后端 API 的冷启动响应时间不超过 5 秒
- **SC-004**: 完整资源栈的销毁操作能够在 10 分钟内完成
- **SC-005**: 同一账户内能够同时运行至少 3 套独立的环境实例
- **SC-006**: 增量更新部署（仅配置变更）的时间不超过 5 分钟
- **SC-007**: 部署脚本能够正确处理并报告至少 90% 的常见错误场景

## Assumptions

- 用户已安装 Node.js 和 AWS CDK CLI
- 用户拥有具有足够权限的 AWS 账户和凭证
- 目标部署区域支持所需的 AWS 服务（Lambda、API Gateway、S3、CloudFront、DynamoDB）
- 前端构建产物和后端代码已经准备就绪可用于部署
- 默认部署区域为 us-east-1（弗吉尼亚），可通过配置切换到其他区域
- Lambda 使用 Python 3.11 运行时，与现有后端代码兼容
- CloudFront 使用默认的 AWS 证书，不配置自定义域名（可后续扩展）
- 可观测性采用最小化策略，仅依赖 AWS 默认日志（Lambda CloudWatch Logs），不额外配置告警或仪表板
