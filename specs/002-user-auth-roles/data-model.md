# Data Model: 用户登录与角色管理

**Feature**: 002-user-auth-roles
**Date**: 2026-01-26

## 实体关系图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           User Entity                                │
├─────────────────────────────────────────────────────────────────────┤
│  id: string (UUID)              PK                                   │
│  email: string                  UK (唯一)                            │
│  password_hash: string          加密存储                             │
│  name: string                   显示名称                             │
│  role: UserRole                 admin | user | viewer               │
│  status: UserStatus             active | disabled                   │
│  failed_login_count: int        登录失败次数                         │
│  locked_until: datetime | null  锁定截止时间                         │
│  created_at: datetime           创建时间                             │
│  updated_at: datetime           更新时间                             │
└─────────────────────────────────────────────────────────────────────┘
           │
           │ owns (1:N)
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Evaluation Entity                             │
│                          (已存在，无变更)                             │
├─────────────────────────────────────────────────────────────────────┤
│  id: string (UUID)              PK                                   │
│  user_id: string                FK → User.id                        │
│  name: string                   评估名称                             │
│  description: string            描述                                 │
│  input_data: JSON               计算输入参数                         │
│  result: JSON                   计算结果                             │
│  created_at: datetime                                                │
│  updated_at: datetime                                                │
└─────────────────────────────────────────────────────────────────────┘
           │
           │ has (1:N)
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Share Entity                                │
│                          (已存在，无变更)                             │
├─────────────────────────────────────────────────────────────────────┤
│  share_token: string            PK                                   │
│  user_id: string                FK → User.id                        │
│  evaluation_id: string          FK → Evaluation.id                  │
│  permission: SharePermission    view_only | view_and_copy           │
│  expires_at: datetime                                                │
│  created_at: datetime                                                │
└─────────────────────────────────────────────────────────────────────┘
```

## 枚举定义

### UserRole（新增）

```python
class UserRole(str, Enum):
    """用户角色枚举"""
    VIEWER = "viewer"   # 访客，权限值 0
    USER = "user"       # 登录用户，权限值 1
    ADMIN = "admin"     # 管理员，权限值 2

    @property
    def level(self) -> int:
        """角色权限等级"""
        return {"viewer": 0, "user": 1, "admin": 2}[self.value]

    def __ge__(self, other: "UserRole") -> bool:
        """权限等级比较"""
        return self.level >= other.level
```

### UserStatus（新增）

```python
class UserStatus(str, Enum):
    """用户状态枚举"""
    ACTIVE = "active"       # 正常状态
    DISABLED = "disabled"   # 已禁用
```

## Pydantic 模型

### UserCreate（请求模型）

```python
class UserCreate(BaseModel):
    """用户注册请求"""
    email: EmailStr = Field(..., description="邮箱")
    password: str = Field(..., min_length=8, description="密码")
    name: str = Field(..., min_length=1, max_length=50, description="用户名")

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('密码必须包含字母')
        if not re.search(r'[0-9]', v):
            raise ValueError('密码必须包含数字')
        return v
```

### UserResponse（响应模型）

```python
class UserResponse(BaseModel):
    """用户信息响应"""
    id: str = Field(..., description="用户 ID")
    email: str = Field(..., description="邮箱")
    name: str = Field(..., description="用户名")
    role: UserRole = Field(..., description="角色")
    status: UserStatus = Field(default=UserStatus.ACTIVE, description="状态")
    created_at: Optional[datetime] = Field(default=None, description="创建时间")
```

### UserUpdate（更新模型）

```python
class UserUpdate(BaseModel):
    """用户信息更新请求"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    password: Optional[str] = Field(default=None, min_length=8)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('密码必须包含字母')
        if not re.search(r'[0-9]', v):
            raise ValueError('密码必须包含数字')
        return v
```

### AdminUserUpdate（管理员更新模型）

```python
class AdminUserUpdate(BaseModel):
    """管理员更新用户请求"""
    role: Optional[UserRole] = Field(default=None, description="角色")
    status: Optional[UserStatus] = Field(default=None, description="状态")
```

### TokenResponse（响应模型，扩展）

```python
class TokenResponse(BaseModel):
    """令牌响应"""
    access_token: str = Field(..., description="访问令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    user: UserResponse = Field(..., description="用户信息")  # 新增
```

### SystemStats（响应模型）

```python
class SystemStats(BaseModel):
    """系统统计信息"""
    total_users: int = Field(..., description="总用户数")
    active_users: int = Field(..., description="活跃用户数")
    disabled_users: int = Field(..., description="禁用用户数")
    admin_count: int = Field(..., description="管理员数量")
    total_evaluations: int = Field(..., description="总评估数")
    total_shares: int = Field(..., description="总分享数")
```

## 数据验证规则

### 用户注册

| 字段 | 验证规则 |
|------|---------|
| email | 有效邮箱格式，系统唯一 |
| password | 最低8位，包含字母和数字 |
| name | 1-50 字符 |

### 角色变更

| 操作 | 验证规则 |
|------|---------|
| 降级管理员 | 系统必须保留至少一个活跃管理员 |
| 自我操作 | 管理员不能修改自己的角色 |
| 禁用用户 | 不能禁用最后一个活跃管理员 |

### 登录安全

| 场景 | 规则 |
|------|------|
| 连续失败 | 3次失败后锁定15分钟 |
| 锁定状态 | 返回明确的锁定信息和剩余时间 |
| 解锁 | 15分钟后自动解锁，或管理员手动解锁 |

## 状态转换

### 用户状态

```
                    ┌─────────────────────┐
                    │      ACTIVE         │
                    │   (正常状态)         │
                    └──────────┬──────────┘
                               │
                 Admin 禁用    │    Admin 启用
                               ▼
                    ┌─────────────────────┐
                    │     DISABLED        │
                    │   (禁用状态)         │
                    └─────────────────────┘
```

### 登录锁定状态

```
┌─────────────────┐     登录成功     ┌─────────────────┐
│    正常状态      │◀───────────────▶│    正常状态      │
│ failed_count=0  │                  │ failed_count=0  │
└────────┬────────┘                  └─────────────────┘
         │
         │ 登录失败
         ▼
┌─────────────────┐     登录失败     ┌─────────────────┐
│   失败计数中     │────────────────▶│    已锁定        │
│ failed_count<3  │                  │ locked_until    │
└────────┬────────┘                  └────────┬────────┘
         │                                     │
         │ 登录成功                             │ 15分钟后
         ▼                                     ▼
┌─────────────────┐                  ┌─────────────────┐
│    正常状态      │                  │    正常状态      │
│ failed_count=0  │                  │ failed_count=0  │
└─────────────────┘                  └─────────────────┘
```

## DynamoDB 表设计

### ipc-cost-users 表

| 属性 | 类型 | 索引 | 说明 |
|------|------|------|------|
| id | S | PK | 用户 UUID |
| email | S | GSI | 用于登录查询 |
| password_hash | S | - | Argon2 哈希 |
| name | S | - | 显示名称 |
| role | S | GSI | 角色筛选 |
| status | S | GSI | 状态筛选 |
| failed_login_count | N | - | 失败计数 |
| locked_until | S | - | ISO 时间戳或空 |
| created_at | S | - | ISO 时间戳 |
| updated_at | S | - | ISO 时间戳 |

### 全局二级索引（GSI）

1. **email-index**: 用于登录时按邮箱查询
2. **role-index**: 用于管理员按角色筛选用户
3. **status-index**: 用于管理员按状态筛选用户
