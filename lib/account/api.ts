/**
 * 账号 API 客户端 —— 后端是 Auth Worker（af_forum-backend，i.2x.nz）
 *
 * 2026-08-07 的两次搬迁：论坛后端随 Oracle VPS 一起没了 → 账号临时挪到生图后端
 * 自建（/api/account/*）→ 当天晚些时候收回边缘，成为唯一权威。**生图后端从此
 * 只认 user_id**，不再有任何账号接口。
 *
 * token 仍写在 localStorage 的 `forum-auth-token` —— 这个键名不能改：
 * 生图前端（draw/api/client.ts、draw/media-token.ts）按它读，换名字等于让所有
 * 已登录用户瞬间掉线。名字里的 "forum" 是历史，别为了好看去动它。
 */

/** Auth Worker。允许本地开发覆盖，但**不接受任意来源** —— 见下面的白名单。 */
const DEFAULT_API_BASE = 'https://i.2x.nz';

function resolveApiBase(): string {
  if (typeof window === 'undefined') return DEFAULT_API_BASE;
  try {
    const override = localStorage.getItem('auth-api-base-url');
    // 只放行 localhost：这个值一旦能被任意设置，一次 XSS 就能把所有人的
    // 登录请求（含明文密码）导到攻击者的服务器上，且完全无感。
    if (override && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(override)) {
      return override;
    }
  } catch {
    /* 隐私模式下 localStorage 可能读不到 */
  }
  return DEFAULT_API_BASE;
}

export const AUTH_KEY = 'forum-auth-token';

export interface AccountUser {
  id: number;
  email: string;
  username?: string;
  nickname?: string | null;
  avatar_url?: string | null;
  role: string;
}

/** GET /api/account/state 的返回：JWT 里没有、且会变的那些东西 */
export interface AccountState {
  github: { id: number; login: string | null } | null;
  email_notifications: boolean;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(AUTH_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(AUTH_KEY, token);
  } catch {
    /* 隐私模式下 localStorage 可能不可写，此时只能维持本次会话 */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    /* 同上 */
  }
}

/**
 * 从本地 token 解出身份，**不请求网络**。
 *
 * JWT 的 payload 是 base64url 编码、不是加密，前端自己就能读。所以「当前登录为谁」
 * 不需要接口 —— 服务端也确实没有 /api/user/me 了（那条被删掉正是因为它每次页面
 * 加载都被调一次，而 WAF 对公开面压的是 10s/次）。
 *
 * 注意：这里读出来的东西**只能用于显示**。它没有经过验签，改本地存储就能伪造，
 * 真正的权限判定永远在服务端。
 */
export function decodeToken(): (AccountUser & { exp: number }) | null {
  const t = getToken();
  if (!t) return null;
  try {
    const part = t.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    const p = JSON.parse(json);
    if (typeof p.id !== 'number') return null;
    return { id: p.id, email: String(p.email || ''), role: String(p.role || 'user'), exp: Number(p.exp || 0) };
  } catch {
    return null;
  }
}

/** token 是否还在有效期内（只看本地 exp，服务端仍会自己判） */
export function isTokenValid(): boolean {
  const p = decodeToken();
  return !!p && p.exp * 1000 > Date.now();
}

/**
 * 重放保护头。
 *
 * Auth Worker 对所有 POST/PUT/DELETE 强制要求 `X-Timestamp` + `X-Nonce`
 * （security.ts 的 validateRequest），nonce 会落库、五分钟内不可重复。
 * 漏了这两个头的症状是「缺少安全头部 400」，很容易被当成参数写错。
 */
function securityHeaders(): Record<string, string> {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return {
    'X-Timestamp': String(Math.floor(Date.now() / 1000)),
    'X-Nonce': rand,
  };
}

export interface ApiError extends Error {
  status: number;
  code?: string;
}

async function call<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const method = (init?.method || 'GET').toUpperCase();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (method !== 'GET' && method !== 'HEAD') Object.assign(headers, securityHeaders());
  if (init?.auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  const res = await fetch(`${resolveApiBase()}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string>) },
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* 后端异常或被 WAF 拦时可能不是 JSON，下面按状态码给话术 */
  }

  if (!res.ok) {
    // 429 只可能来自 Cloudflare WAF 的速率限制（鉴权口压的是 10s 一次）。
    // 后端不再做任何限流，所以这里的话术要说清楚「等一下」而不是「出错了」。
    const msg =
      res.status === 429
        ? '操作太频繁了，请等 10 秒再试'
        : data?.error || data?.detail || `请求失败（${res.status}）`;
    throw Object.assign(new Error(msg), { status: res.status, code: data?.code });
  }
  return data as T;
}

// ── 登录 / 注册 ────────────────────────────────────────────────

export function login(email: string, password: string) {
  return call<{ token: string; user?: AccountUser }>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * 不发 username：业务层只认 user_id，账号页也只展示 ID + 邮箱。
 * 后端收不到这个字段会自己生成 `user<id>`（users.username 是 NOT NULL）。
 */
export function register(email: string, password: string) {
  return call<{ success: boolean; message: string }>('/api/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// ── 找回密码 ──────────────────────────────────────────────────

export function forgotPassword(email: string) {
  return call<{ success?: boolean; message?: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * 字段名是 `new_password` 不是 `password` —— 发错了后端只回一句「缺少参数」400，
 * 看不出是哪个字段（后端为兼容旧 bundle 两个名字都认，新代码一律发正式名）。
 */
export function resetPassword(token: string, password: string) {
  return call<{ success?: boolean; message?: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: password }),
  });
}

// ── 账号状态 ──────────────────────────────────────────────────

/** 设置页要的全部只读状态，一次拿全（拆成多个请求会被 10s 限流打死） */
export function accountState() {
  return call<AccountState>('/api/account/state', { auth: true });
}

// ── 孤儿账号补录 ──────────────────────────────────────────────

/**
 * 凭现有登录态把邮箱+密码补上，服务端用 JWT 里的 id 建行。
 *
 * 给的是那批「D1 备份时间点之后注册」的用户：生图库里按 user_id 记着他们的
 * 余额和作品，但账号表里没有对应行。补录**必须沿用原 id**，否则资产认不回来。
 */
export function claimAccount(email: string, password: string) {
  return call<{ success: boolean; token: string; user: AccountUser; message: string }>(
    '/api/account/claim',
    { method: 'POST', auth: true, body: JSON.stringify({ email, password }) },
  );
}

// 两步验证（TOTP）已于 2026-08-07 整条下线，后端三个端点连同白名单一起删了。

// ── GitHub ───────────────────────────────────────────────────

/** 跳去 GitHub 授权。mode=link 需要已登录（带 token 让后端认人） */
export function githubStartUrl(mode: 'login' | 'link', redirect: string): string {
  const u = new URL('/api/auth/github/start', resolveApiBase());
  u.searchParams.set('mode', mode);
  u.searchParams.set('redirect', redirect);
  return u.toString();
}

export function githubUnlink() {
  return call<{ success: boolean }>('/api/auth/github/unlink', { method: 'POST', auth: true });
}

// ── 登出 ─────────────────────────────────────────────────────

/**
 * 登出 = 删掉本地 token，**没有服务端调用**。
 *
 * Auth Worker 不保存任何会话状态，令牌签出去就自持到 exp（7 天）。所以这一步
 * 只是让这台设备忘掉它 —— 令牌本身在过期前仍然有效，别把这个函数理解成「吊销」。
 */
export function logout(): void {
  clearToken();
}
