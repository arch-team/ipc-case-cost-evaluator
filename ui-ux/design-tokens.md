# UI 设计规范 (Design Tokens) - 深色科技感主题

基于 pencil-define.pen 深色主题变体的完整设计系统规范文档。

## 1. 主题概述

当前实现：**深色科技感主题 (Dark Tech Theme)**

特点：
- 深蓝黑色背景 (#0F0F1A)
- 紫蓝色主色调 (#6366F1)
- 发光效果和渐变设计
- 高对比度浅色文字

## 2. 颜色系统

### 2.1 背景色

| 变量名 | 色值 | 用途 |
|--------|------|------|
| --color-bg-page | #0F0F1A | 页面背景 |
| --color-bg-card | #1A1A2E | 卡片/容器背景 |
| --color-bg-hover | #252542 | 悬停状态背景 |
| --color-bg-disabled | #2A2A40 | 禁用状态背景 |
| --color-bg-sidebar | #0F172A | 侧边栏背景 |

### 2.2 主色调

| 变量名 | 色值 | 用途 |
|--------|------|------|
| --color-primary | #6366F1 | 主要交互元素 |
| --color-primary-hover | #4F46E5 | 主色悬停状态 |
| --color-primary-light | #1E1B4B | 主色深色背景 |

### 2.3 强调色 (Accent Colors)

| 变量名 | 色值 | 用途 |
|--------|------|------|
| --color-accent | #22D3EE | 科技感青色强调 |
| --color-accent-cyan | #06B6D4 | 青色变体 |
| --color-accent-violet | #8B5CF6 | 紫色强调 |
| --color-accent-rose | #F43F5E | 玫红色强调 |

### 2.4 语义色

| 变量名 | 色值 | 用途 |
|--------|------|------|
| --color-success | #10B981 | 成功状态 |
| --color-success-light | #064E3B | 成功状态背景 |
| --color-warning | #F59E0B | 警告状态 |
| --color-warning-light | #78350F | 警告状态背景 |
| --color-error | #EF4444 | 错误状态 |
| --color-error-light | #7F1D1D | 错误状态背景 |
| --color-info | #6366F1 | 信息提示 |

### 2.5 文字色

| 变量名 | 色值 | 用途 |
|--------|------|------|
| --color-text-primary | #F8FAFC | 主要文字 |
| --color-text-secondary | #94A3B8 | 次要文字 |
| --color-text-tertiary | #64748B | 辅助文字 |
| --color-text-disabled | #475569 | 禁用文字 |
| --color-text-inverse | #0F172A | 反色文字(用于浅色背景) |

### 2.6 边框色

| 变量名 | 色值 | 用途 |
|--------|------|------|
| --color-border | #334155 | 默认边框 |
| --color-border-light | #1E293B | 浅色边框 |
| --color-border-input | #475569 | 输入框边框 |

### 2.7 存储类型色

| 存储类型 | 色值 | 说明 |
|---------|------|------|
| S3 Standard | #1677FF | 蓝色 |
| S3 Glacier IR | #722ED1 | 紫色 |
| 混合策略 | #FA8C16 | 橙色 |

### 2.8 图表色系统

| 费用项 | 色值 |
|-------|------|
| 存储费用 | #1677FF |
| PUT请求费 | #13C2C2 |
| GET请求费 | #FA8C16 |
| 传输费用 | #F759AB |
| 数据传输费 | #FF7A45 |
| 数据检索费 | #69B1FF |
| 生命周期费 | #B37FEB |

## 3. 渐变色

### 3.1 标题渐变 (科技感三色)

```css
--gradient-full: linear-gradient(135deg, #6366F1 0%, #22D3EE 50%, #4F46E5 100%);
```

### 3.2 按钮渐变

```css
--gradient-primary: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
```

### 3.3 统计卡片渐变

```css
/* 主色卡片 */
--gradient-stat-primary: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%);

/* 成功色卡片 */
--gradient-stat-success: linear-gradient(135deg, #064E3B 0%, #065F46 100%);
```

## 4. 阴影与发光效果

### 4.1 主色发光

```css
--shadow-primary: 0 4px 20px rgba(99, 102, 241, 0.5), 0 0 40px rgba(99, 102, 241, 0.2);
--shadow-primary-hover: 0 8px 30px rgba(99, 102, 241, 0.6), 0 0 60px rgba(99, 102, 241, 0.3);
```

### 4.2 卡片发光

```css
/* 悬停时的发光边框效果 */
box-shadow: 0 0 30px rgba(99, 102, 241, 0.3), 0 20px 25px -5px rgba(0, 0, 0, 0.3);
```

### 4.3 统计卡片发光

```css
/* 紫色统计卡片 */
box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
border: 1px solid #4F46E5;

/* 绿色统计卡片 */
box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
border: 1px solid #10B981;
```

## 5. 间距系统

| 变量名 | 值 | 用途 |
|--------|-----|------|
| --spacing-page | 32px | 页面边距 |
| --spacing-section | 40px | 区块间距 |
| --spacing-card-gap | 24px | 卡片间距 |
| --spacing-card-padding | 20px | 卡片内边距 |

## 6. 圆角系统

| 变量名 | 值 | 用途 |
|--------|-----|------|
| --radius-small | 6px | 按钮、小型元素 |
| --radius-medium | 12px | 卡片、输入框 |
| --radius-large | 16px | 大型卡片、模态框 |

## 7. Ant Design 主题配置

```typescript
const customTheme = {
  token: {
    colorPrimary: '#6366F1',
    colorSuccess: '#10B981',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorInfo: '#6366F1',
    colorText: '#F8FAFC',
    colorTextSecondary: '#94A3B8',
    colorTextTertiary: '#64748B',
    colorBorder: '#334155',
    colorBorderSecondary: '#1E293B',
    colorBgContainer: '#1A1A2E',
    colorBgElevated: '#252542',
    colorBgLayout: '#0F0F1A',
    borderRadius: 6,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
  },
  algorithm: theme.darkAlgorithm,
};
```

## 8. 应用示例

### 8.1 科技感标题

```css
.hero-title {
  background: linear-gradient(135deg, #6366F1 0%, #22D3EE 50%, #4F46E5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### 8.2 发光按钮

```css
.primary-button {
  background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.5), 0 0 40px rgba(99, 102, 241, 0.2);
}

.primary-button:hover {
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.6), 0 0 60px rgba(99, 102, 241, 0.3);
}
```

### 8.3 深色卡片

```css
.dark-card {
  background: #1A1A2E;
  border: 1px solid #334155;
  border-radius: 12px;
}

.dark-card:hover {
  border-color: #6366F1;
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.3);
}
```

### 8.4 发光图标容器

```css
.icon-wrapper {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.4) 100%);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
  border-radius: 16px;
}
```

---

**版本**: 2.0.0 (深色科技感主题)
**更新日期**: 2026-01-27
**来源**: pencil-define.pen (第3列深色主题变体)
