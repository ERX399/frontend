# 论坛后端复刻规格

日期：2026-08-27
主题：参考 CForum，为现有 /forum 前端复刻一套 Cloudflare Workers 后端
状态：待夏老板审阅

## 1. 目标与范围

现有仓库里已经有一套完整的论坛前端（`app/forum/` + `lib/forum/`），其 API 契约
全部写死在 `lib/forum/api/client.ts`。线上 `https://i.2x.nz` 的后端已下线（所有
`/api/*` 返回 404）。本项目的目标：

> 按前端契约，给这套论坛前端**补上一个可本地跑、可免费部署的后端**，
> 让论坛重新可用。

参考实现：**[CForum](https://github.com/adysec/CForum)**（AGPL-3.0，79 star），
技术栈与 2x.nz 线上遗留完全一致（Workers + Pages Functions + D1 + R2 + Turnstile
+ SMTP + TOTP），且 CORS 头、API 端点、数据表名与前端契约高度吻合。本规格以它
为骨架，**补上前端在用而 CForum 缺失的接口**。

## 2. 技术栈（不可变）

- 运行时：Cloudflare Workers（单体 `src/index.ts`）
- 静态托管：Cloudflare Pages + Pages Functions 代理（`functions/[[path]].ts`）
- 数据库：D1（SQLite）
- 文件存储：R2
- 人机验证：Turnstile
- 邮件：SMTP（`src/smtp.ts`）
- TOTP：otpauth
- 本地开发：`wrangler dev`，端口 `8787`（前端 `dev` 环境指向它）
- 生产 API 根：自定义域名（部署时绑定，暂定 `i.<域名>`）

## 3. 目录结构

```
forum-backend/
├── src/
│   ├── index.ts          # Worker 路由 + 全部 handler（参考 CForum 拆分后按域切文件）
│   ├── security.ts       # JWT 签发/校验、nonce 防重放、时间戳校验
│   ├── s3.ts             # R2 上传/删除/公网 URL/孤儿扫描（重命名为 r2.ts）
│   ├── smtp.ts           # 邮件发送
│   ├── identicon.ts      # 用户默认头像
│   ├── otpauth.d.ts      # TOTP 类型
│   └── trash/            # 待办：把 74KB 单体按域拆成 auth/posts/comments/users/admin
├── functions/
│   └── [[path]].ts       # Pages Functions 代理（静态走 Pages，/api 转发 Worker）
├── migrations/
│   └── 0001_initial.sql   # D1 schema（在 CForum 基础上扩列）
├── wrangler.jsonc
└── package.json
```

> 实现阶段把 CForum 的 74KB 单文件按「认证 / 帖子 / 评论 / 用户 / 后台」拆开，
> 每块单一职责，复用同一套请求上下文与会话校验。当前前端代码里 `app/forum/` 才是
> 页面主体，`app/forum/forum-provider.tsx` 挂认证上下文；后端独立成仓库目录
> `forum-backend/`，不塞进现有 `lib/forum/`（那是纯前端纯函数的家）。

## 4. 数据模型（CForum schema 扩展版）

基于 CForum 的 `schema.sql`，按前端契约补列。**加粗为新增/变更字段**。

```sql
users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,            -- 仅为 Github-only 用户可为占位；has_password 用于展示
  role TEXT DEFAULT 'user',          -- user / admin
  verified INTEGER DEFAULT 0,
  verification_token TEXT,
  totp_secret TEXT,
  totp_enabled INTEGER DEFAULT 0,
  reset_token TEXT,
  reset_token_expires INTEGER,
  pending_email TEXT,
  email_change_token TEXT,
  avatar_url TEXT,
  bio TEXT,                          -- 新增：个签
  gender TEXT,                       -- 新增：male/female/other/prefer_not_to_say
  age INTEGER,                       -- 新增：出生年
  region TEXT,                       -- 新增：地区
  qq TEXT,                           -- 新增：QQ 号（绑定 Bot 推送）
  github_id INTEGER,                 -- 新增：GitHub OAuth
  github_login TEXT,
  github_avatar_url TEXT,
  has_password INTEGER DEFAULT 1,    -- 新增：Github-only 时 0，解绑 Github 需先设密码
  email_notifications INTEGER DEFAULT 1,
  article_notifications INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,                      -- 新增：摘要（前端列表卡片用）
  cover_image_url TEXT,              -- 新增：封面（前端列表卡片用）
  category_id INTEGER,
  is_pinned INTEGER DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,              -- 新增：编辑时间
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  parent_id INTEGER,
  author_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_pinned INTEGER DEFAULT 0,       -- 新增：作者/管理员置顶评论
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,              -- 新增：编辑时间
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (parent_id) REFERENCES comments(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER,                   -- 改为可空：评论点赞也走这张表，用 target_id 区分
  comment_id INTEGER,                -- 新增：评论点赞
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, comment_id, user_id)
);

sessions (
  jti TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  device_fingerprint TEXT,           -- 新增：X-Device-Fingerprint，合并同设备登录
  user_agent TEXT,                   -- 新增：登录设备列表展示
  ip TEXT,                           -- 新增
  created_at INTEGER,                -- epoch 秒
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER,              -- 新增：登录设备「最后活跃」
  FOREIGN KEY (user_id) REFERENCES users(id)
);

categories (id, name UNIQUE, created_at)         -- 不变
settings (key TEXT PRIMARY KEY, value TEXT)       -- 不变
nonces (nonce TEXT PRIMARY KEY, expires_at INTEGER) -- 不变
audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, created_at) -- 不变
notify_prefs ( user_id INTEGER PRIMARY KEY, prefs TEXT /* JSON */ )  -- 新增：通知偏好
```

## 5. API 契约（前端 client.ts ↔ 后端，逐条对齐）

前端 `lib/forum/api/client.ts` 里「有函数 = 必须实现」。下面按域列出，并标注与
CForum 的关系：**✅ 已有**（照搬适配）、**🔧 需改**（CForum 有但字段/行为要调）、
**➕ 需新增**。

### 5.1 认证与会话
| 方法 | 端点 | 状态 |
|---|---|---|
| POST | `/api/login` | ✅ 已有（补 TOTP + turnstile + 设备指纹） |
| POST | `/api/register` | ✅ 已有 |
| POST | `/api/logout` | ➕ 需新增（吊销当前 jti 会话） |
| GET | `/api/session` | ➕ 需新增（token 换当前用户） |
| GET | `/api/user/me` | ✅ 已有（CForum 用 `/api/users` 缺 me，需补） |
| POST | `/api/auth/forgot-password` | ✅ 已有 |
| POST | `/api/auth/reset-password` | ✅ 已有 |
| GET | `/api/auth/github/start` | ➕ 需新增 |
| POST | `/api/auth/github/unlink` | ➕ 需新增 |
| GET | `/api/config` | 🔧 改：补 `allowRegistration`、`turnstileSiteKey`、`userCount` |

### 5.2 用户资料与安全
| 方法 | 端点 | 状态 |
|---|---|---|
| POST | `/api/user/profile` | ✅ 已有（username/avatar/通知开关） |
| POST | `/api/user/me/profile` | ➕ 新增（gender/bio/age/region） |
| POST | `/api/user/change-email` | ✅ 已有（改 D1 字段名） |
| POST | `/api/user/totp/setup` | ✅ 已有 |
| POST | `/api/user/totp/verify` | ✅ 已有 |
| POST | `/api/user/totp/disable` | ➕ 新增 |
| POST | `/api/user/delete` | ✅ 已有 |
| POST | `/api/user/me/qq/send-code` | ➕ 新增（QQ Bot 绑定） |
| POST | `/api/user/me/qq/bind` | ➕ 新增 |
| POST | `/api/user/me/qq/send-unbind-code` | ➕ 新增 |
| POST | `/api/user/me/qq/unbind` | ➕ 新增 |
| GET | `/api/users/:id` | ➕ 新增（用户主页） |
| GET | `/api/users/:id/posts` | ➕ 新增 |

### 5.3 会话（登录设备）
| 方法 | 端点 | 状态 |
|---|---|---|
| GET | `/api/user/sessions` | ➕ 新增（读 sessions 表） |
| DELETE | `/api/user/sessions/:jti` | ➕ 新增 |
| POST | `/api/user/sessions/revoke-others` | ➕ 新增 |

### 5.4 通知偏好
| 方法 | 端点 | 状态 |
|---|---|---|
| GET | `/api/user/me/notify-prefs` | ➕ 新增 |
| POST | `/api/user/me/notify-prefs` | ➕ 新增（QQ 推送走 QQ Bot） |
| GET | `/api/subscriptions/article-notifications` | ➕ 新增（博客更新订阅计数） |

### 5.5 帖子
| 方法 | 端点 | 状态 |
|---|---|---|
| GET | `/api/posts` | 🔧 改：补 `sort_by`(time/time_asc/likes/comments/views)、`q` 搜索、`category_id`、`limit/offset`，返回补 `cover_image_url`/`excerpt`/`author_name`/`author_avatar`/`category_name`/`comment_count`/`like_count` |
| POST | `/api/posts` | ✅ 已有（补 `excerpt`/`cover_image_url` 落库） |
| GET | `/api/posts/:id` | 🔧 改：返回详情含 `rendered.html`、浏览 +1 |
| PUT | `/api/posts/:id` | ✅ 已有 |
| DELETE | `/api/posts/:id` | ✅ 已有 |
| POST | `/api/posts/:id/like` | ✅ 已有（切换） |
| GET | `/api/posts/:id/like-status` | ✅ 已有（已登录才有效，未登录恒 false） |

### 5.6 评论
| 方法 | 端点 | 状态 |
|---|---|---|
| GET | `/api/posts/:id/comments` | 🔧 改：支持 `sort_by`(time/likes) + `sort_dir`，返回补 `author` 对象、`is_pinned` |
| POST | `/api/posts/:id/comments` | ✅ 已有（补 turnstile、parent_id 压平为二级） |
| PUT | `/api/comments/:id` | ➕ 新增（置顶 is_pinned） |
| DELETE | `/api/comments/:id` | ✅ 已有 |
| POST | `/api/comments/:id/like` | ➕ 新增（切换） |
| GET | `/api/sse?postId=N` | ➕ 新增（Durable Object 广播 new_comment） |

### 5.7 分类 / 上传 / 后台
| 方法 | 端点 | 状态 |
|---|---|---|
| GET | `/api/categories` | ✅ 已有 |
| POST | `/api/upload` | ✅ 已有（走 R2，返回 `url`） |
| GET | `/api/admin/stats` | ✅ 已有 |
| GET/POST | `/api/admin/settings` | ✅ 已有 |
| GET | `/api/admin/users` | ✅ 已有 |
| POST | `/api/admin/users/:id/update` | ✅ 已有 |
| POST | `/api/admin/users/:id/verify` | ✅ 已有 |
| DELETE | `/api/admin/users/:id` | ✅ 已有 |
| DELETE | `/api/admin/posts/:id` | ✅ 已有 |
| GET/POST | `/api/admin/categories` | ✅ 已有 |
| PUT/DELETE | `/api/admin/categories/:id` | ✅ 已有 |
| POST | `/api/admin/email/test` | ➕ 新增（对应前端 sendAdminTestEmail） |
| GET/POST | `/api/admin/cleanup/analyze`、`execute` | ✅ 已有（R2 孤儿扫描） |

### 5.8 统一约定
- 报文：所有响应 JSON；错误形如 `{ "error": "...", "code": "..." }`；`code` 保留
  `TOTP_REQUIRED`/`TOTP_INVALID`，前端靠它弹 TOTP 框。
- 认证：`Authorization: Bearer <token>`，JWT 内含 `sub`（user_id）+ `jti`，过期即 401。
- 防重放：写操作必带 `X-Timestamp`（±60s）与 `X-Nonce`（一次性，落 `nonces` 表）。
- 鉴权门槛：非公开 `GET`（如 `/api/user/me`）走中间件统一校验会话。
- 字段映射：snake_case（后端存储/返回）↔ camelCase（前端），映射只维护一份
  （与前端 `lib/forum/api/map-post.ts`/`map-comment.ts` 对称：前端负责 camelCase，
  后端负责组装 `author` 对象与 `rendered.html`）。

## 6. 组件划分（职责单一）

1. **Router**：URL → handler 分发，内联 CORS 与 OPTIONS 短路（CORS 头与线上
   一致：`Allow-Headers: Content-Type, Authorization, X-Timestamp, X-Nonce, X-Device-Fingerprint`）。
2. **Auth 中间件**：Bearer → JWT 校验 → 注入 `payload`；公开路径白名单放行。
3. **Security 模块**：JWT 签发/校验、`X-Timestamp`/`X-Nonce` 防重放、限流（Turnstile + Durable Object 计数）。
4. **R2 模块**：上传（头像/webp 压缩在后端不必做，前已压）、公网 URL、孤儿扫描（analyze/execute）。
5. **SMTP 模块**：发信（注册验证、忘记密码、换邮箱、管理测试邮件）。
6. **QQ Bot 模块**：QQ 绑定验证码 + 通知推送（去 qq 机器人框架，token 走 secret）。
7. **D1 数据层**：按表封装 query，供各 handler 复用。
8. **SSE Durable Object**：`/api/sse` 长连广播新评论，broken 时客户端补拉全量。

## 7. 数据流（以发帖 + 实时评论为例）

1. 客户端 `POST /api/posts`（带 Bearer + X-Timestamp + X-Nonce）。
2. Auth 中间件校验 JWT，Security 校验 nonce 未被用、时间窗内。
3. handler 写 `posts`（存 excerpt/cover），
4. 返回 snake_case 帖子对象，前端 `mapPost` 渲染。
5. 另一用户在详情页 `GET /api/posts/:id` 打开时，其前端 `useCommentStream`
   连上 `/api/sse?postId=N`（Durable Object）。
6. 有人 `POST /api/posts/:id/comments` 成功后，Worker 调 SSEHub 广播 `new_comment`，
   详情页实时插入评论树（`insertComment` 按 id 去重）。

## 8. 错误处理

- 401 未登录 / token 过期：`{error, code}`，前端按 `code` 区分 TOTP 与非 TOTP，
  TOTP 场景不清 `localStorage`。
- 422 参数/校验失败：`{error}`，前端 toast 展示。
- 429 限流：Turnstile 失败或瞬时频次超限，`{error}`。
- 5xx：捕获异常返回 `{error}`，不泄露堆栈；审计写 `audit_logs`。
- 前端已知错误码文档：`TOTP_REQUIRED`、`TOTP_INVALID`、`github_*` 系列
  （见 `lib/forum/utils/github-oauth.ts` 的 `describeGithubError` 映射，后端要
  返回这些 code 才能被正确渲染成中文）。

## 9. 测试策略

- **单测**（vitest，CForum 已带 `vitest.config.mts`）：
  - security：JWT 签发/过期/篡改、nonce 重放拒绝、时间窗外拒绝。
  - map 函数：snake↔camel 字段一一对应（与前端 map 对称的假数据）。
  - 评论树：`buildCommentTree` 二级压平正确。
  - 权限：admin-only 路由对非 admin 返回 403。
- **集成测试**：用 `wrangler dev` + 本地 D1（miniflare），跑一遍
  register → login → createPost → listPosts(断言 sort/字段) → createComment →
  like → admin/verify 的 happy path。
- **手工验收**：前端 `dev` 环境（`127.0.0.1:8787`）逐个页面点通：
  论坛列表 / 发帖 / 详情 / 评论 / 点赞 / 个人中心（含 TOTP、GitHub、QQ、登录设备
  的五块 UI）/ 管理后台。

## 10. 分期（若分批交付）

- **第一批（可跑通）**：§5.1 认证(含 session/logout/user-me) + §5.5 帖子 + §5.6
  评论 + §5.7 分类/上传/后台基础 + §6 基础设施。论坛核心闭环。
- **第二批（补齐前端无死角）**：GitHub OAuth、QQ 绑定、登录设备、通知偏好、
  `/api/sse` 实时评论、后台邮件测试。

## 11. 风险与待确认

1. **AGPL-3.0 传染性**：自用安全；若未来闭源分发需另评估。默认接受（夏老板已拍板「参考复刻」）。
2. **QQ Bot 与 SMTP 需外部凭证**：QQ 机器人框架 + 发信 SMTP 账号需在部署时用
   `wrangler secret` 注入，本地开发用占位实现，不影响核心闭环。
3. **GitHub OAuth**：需注册 OAuth App（回调地址 = 部署域名），本地开发可跳过。
4. **Turnstile**：需要 CF 账号建 site key；未配置时 `turnstile_enabled=0`，关掉人机验证也能跑。
5. **国内访问 CF**：若面向大陆用户，`workers.dev` 域名不可直连，需绑定已备案/
   可解析自定义域名（部署阶段处理，不影响开发）。

## 12. 交付定义（Done）

- 本地 `wrangler dev` 起在 `8787`，前端 `dev` 环境全页面可点通上述 happy path。
- 前端 `client.ts` 全部函数都有对应后端实现（无 404）。
- schema 迁移可重复执行（`wrangler d1 migrations apply`）。
- 单测通过；README 记录一键启动 + secret 配置清单。