/**
 * WebNovel 前端 API 客户端。
 *
 * 鉴权完全复用论坛登录态：`forum-auth-token` 存的是论坛签发的 JWT，
 * 直接以 `Authorization: Bearer` 发给 /webnovel/api/* 同源代理，
 * 后端用同一 JWT_SECRET 验签，不走论坛后端。
 *
 * 注意：base 是**同源相对路径** `/webnovel/api`，浏览器经 Express 代理转发到
 * 后端 127.0.0.1:8790；不要往图片 URL 里拼 token（复制图片地址会泄露全权令牌）。
 */
import type { Novel, NovelListResult, NovelSource, NovelStatus } from '../types';

export class WebnovelApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'WebnovelApiError';
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('forum-auth-token');
  } catch {
    return null;
  }
}

const BASE = '/webnovel/api';

async function webnovelRequest<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...fetchOptions, headers });
  if (res.status === 401 && auth) {
    // 登录态失效：清 token，由调用方决定跳论坛登录
    try {
      localStorage.removeItem('forum-auth-token');
    } catch {}
    throw new WebnovelApiError('登录已失效', 401);
  }
  if (!res.ok) {
    let message = '请求失败';
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) message = j.error;
    } catch {}
    throw new WebnovelApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

export interface NovelInput {
  title: string;
  slug?: string;
  description?: string;
  cover?: string;
  tags?: string[];
  source?: NovelSource | null;
  authorName?: string;
  /** 匿名发布：读者端不显示署名 */
  anonymous?: boolean;
  /** AI 撰写声明。站内 AI 生成的作品由后端钉死，这里传了也改不掉 */
  aiGenerated?: boolean;
}

export function fetchNovels(params: { page?: number; q?: string } = {}) {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.q) sp.set('q', params.q);
  return webnovelRequest<NovelListResult>(`/novels?${sp.toString()}`);
}

/**
 * 取作品详情。`previewToken` 用于作者预览未发布作品（编辑器预览链接的
 * `?preview=`）—— 匿名/他人拿同一个 slug 一律 404。
 */
export function fetchNovel(slug: string, previewToken?: string) {
  return webnovelRequest<Novel>(`/novels/${encodeURIComponent(slug)}`, {
    headers: previewToken ? { authorization: `Bearer ${previewToken}` } : undefined,
  });
}

export function fetchMyNovels() {
  return webnovelRequest<{ novels: Novel[] }>('/novels/mine', { auth: true });
}

export function fetchMe() {
  return webnovelRequest<{ user: { id: number; role: string; email: string } }>('/me', { auth: true });
}

export function createNovel(input: NovelInput) {
  return webnovelRequest<Novel>('/novels', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  });
}

export function updateNovel(slug: string, input: Partial<NovelInput>) {
  return webnovelRequest<Novel>(`/novels/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(input),
  });
}

export function publishNovel(slug: string, status: NovelStatus) {
  return webnovelRequest<Novel>(`/novels/${encodeURIComponent(slug)}/publish`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ status }),
  });
}

// ── 导入 / 导出 JSON（格式说明见 /webnovel/format）──

/** 体检结果：与后端 services/validate.ts 的 Issue 同形 */
export interface NovelIssue {
  level: 'error' | 'warn';
  code: string;
  message: string;
}

export interface ImportResult {
  ok: boolean;
  slug: string;
  title: string;
  pages: number;
  issues: NovelIssue[];
}

/**
 * 导入 JSON，落成草稿。
 *
 * **把原文整段交给后端**（`text` 字段）而不是前端先 JSON.parse：后端复用的是
 * 站内 AI 那条管道（抠代码块 → 形状归一 → 补 id / 修悬空跳转 → 体检），
 * 前端自己 parse 就享受不到这些容错，用户粘贴带 ```json 的内容会直接失败。
 */
export function importNovel(text: string, authorName?: string) {
  return webnovelRequest<ImportResult>('/novels/import', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ text, authorName }),
  });
}

/** 导出用的顶层结构（与导入接受的、/webnovel/format 里写的完全一致） */
export function novelExportJson(novel: {
  title: string;
  description: string;
  tags: string[];
  source: NovelSource | null;
}): string {
  return JSON.stringify(
    {
      title: novel.title,
      description: novel.description,
      tags: novel.tags,
      source: novel.source,
    },
    null,
    2,
  );
}

/** 触发浏览器下载。文件名用 slug，纯中文标题当文件名在部分系统上会乱码 */
export function downloadNovelJson(
  slug: string,
  novel: { title: string; description: string; tags: string[]; source: NovelSource | null },
): void {
  const blob = new Blob([novelExportJson(novel)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug || 'novel'}.json`;
  a.click();
  // 立刻 revoke 会让 Firefox 下载不到，等一拍再放
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function deleteNovel(slug: string) {
  return webnovelRequest<{ ok: boolean }>(`/novels/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    auth: true,
  });
}

// ── 创作点钱包 / AI 创作 ──

export interface WalletInfo {
  balance: number;
  total_purchased: number;
  /** 按 token 计费：成本 = ceil(tokens / token_per_point)，与生图同口径 */
  token_per_point: number;
  /** 开跑前要求的最低余额 */
  min_balance: number;
  per_sku: number;
  recharge_url: string;
}

export function fetchWallet() {
  return webnovelRequest<WalletInfo>('/wallet', { auth: true });
}

/** 付款后主动核对爱发电订单 */
export function syncWallet() {
  return webnovelRequest<{ balance: number; total_purchased: number }>('/wallet/sync', {
    method: 'POST',
    auth: true,
  });
}

export interface AiGenerated {
  title: string;
  description: string;
  tags: string[];
  source: NovelSource;
  balance: number;
  /** 本次实际扣的创作点（按 token 结算） */
  cost: number;
  /** 本次消耗的 token */
  tokens: number;
}

/**
 * 提交 AI 生成任务，返回 job_id。
 *
 * **必须异步轮询**：一部作品要 60~180 秒，而 Cloudflare 在 ~58 秒就把请求判 502，
 * 同步等待在生产上永远拿不到结果。服务端提交时扣点，失败自动退款。
 */
export function submitAiGeneration(requirement: string, authorName?: string) {
  return webnovelRequest<{ job_id: string; balance: number }>('/ai/generate', {
    method: 'POST',
    auth: true,
    // JWT 里没有 name，作者名只能由前端从论坛用户信息带过来（仅展示用）。
    // 漏传的话作品列表会显示「匿名」。
    body: JSON.stringify({ requirement, authorName }),
  });
}

/**
 * 提交增量修改：在**已保存的作品**上按要求改写。
 * 作品从库里读，所以随时可以回来接着改，改多少轮都行。
 */
export function submitAiRefine(slug: string, instruction: string) {
  return webnovelRequest<{ job_id: string; balance: number }>('/ai/refine', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ slug, instruction }),
  });
}

/** 单个任务状态。结果已落库，所以只回元信息（slug/title），不回整份 source */
export interface AiJobStatus {
  status: 'pending' | 'done' | 'error';
  kind: 'generate' | 'refine';
  slug: string;
  title: string;
  error: string;
  tokens: number;
  cost: number;
  balance: number;
}

export function fetchAiJob(jobId: string) {
  return webnovelRequest<AiJobStatus>(`/ai/job/${encodeURIComponent(jobId)}`, { auth: true });
}

/**
 * 一个 AI 创作任务。**任务跑在后端、结果直接落库** ——
 * 发起后可以直接关页面，回来在「我的作品」里看结果。
 */
export interface AiJob {
  id: string;
  kind: 'generate' | 'refine';
  prompt: string;
  slug: string;
  status: 'pending' | 'done' | 'error';
  title: string;
  error: string;
  tokens: number;
  cost: number;
  created_at: number;
  finished_at: number | null;
}

export function fetchAiJobs(limit = 20) {
  return webnovelRequest<{ jobs: AiJob[] }>(`/ai/jobs?limit=${limit}`, { auth: true });
}

export interface StreamOpts {
  onTick?: (seconds: number) => void;
  /** 模型原始输出的增量（content=正文，reasoning=思考过程） */
  onDelta?: (text: string, kind: 'content' | 'reasoning') => void;
  timeoutMs?: number;
}

/**
 * 在线时实时观看模型输出（**可选**）。
 *
 * 任务跑在后端、结果直接落库，所以这条流断了、页面关了都不影响创作 ——
 * 它纯粹是"想看就看"。EventSource 带不了 Authorization 头，故用 fetch 手工解析 SSE 帧。
 */
export async function watchAiJob(jobId: string, opts: StreamOpts = {}): Promise<AiJobStatus> {
  const token = getToken();
  const started = Date.now();
  // 分段生成后长篇作品要跑十几分钟（大纲 + 每 5 页一批 + 定点修复），
  // 10 分钟不够看完全程 —— 超时只是停止观看，任务在后端照跑，但没必要提前放手
  const timeoutMs = opts.timeoutMs ?? 20 * 60_000;
  const tick = setInterval(() => opts.onTick?.(Math.round((Date.now() - started) / 1000)), 1000);
  try {
    const res = await fetch(`${BASE}/ai/job/${encodeURIComponent(jobId)}/stream`, {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok || !res.body) throw new WebnovelApiError('无法建立流式连接', res.status);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const frames = buf.split('\n\n');
      buf = frames.pop() || '';
      for (const frame of frames) {
        let ev = 'message';
        let data = '';
        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) ev = line.slice(6).trim();
          else if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (!data) continue; // 心跳 `: ping` 之类
        const payload = JSON.parse(data);
        if (ev === 'snapshot' && payload.text) opts.onDelta?.(payload.text, 'content');
        else if (ev === 'delta') opts.onDelta?.(payload.text, payload.kind);
        else if (ev === 'done' || ev === 'error') return fetchAiJob(jobId);
      }
    }
    return fetchAiJob(jobId); // 流结束：以库里的状态为准
  } finally {
    clearInterval(tick);
  }
}

/** 轮询任务直到结束（SSE 不可用时用它；也可用于回到页面后继续跟进） */
export async function waitAiJob(
  jobId: string,
  opts: { onTick?: (seconds: number) => void; timeoutMs?: number } = {},
): Promise<AiJobStatus> {
  const timeoutMs = opts.timeoutMs ?? 20 * 60_000;
  const started = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 3000));
    opts.onTick?.(Math.round((Date.now() - started) / 1000));
    const r = await fetchAiJob(jobId);
    if (r.status !== 'pending') return r;
    if (Date.now() - started > timeoutMs) return r; // 超时就交给任务列表，任务仍在后台跑
  }
}

/** 跟进任务：SSE 优先，失败回退轮询。**中断不影响创作**（后端在跑、结果会落库） */
export async function followAiJob(jobId: string, opts: StreamOpts = {}): Promise<AiJobStatus> {
  try {
    return await watchAiJob(jobId, opts);
  } catch {
    return waitAiJob(jobId, opts);
  }
}

// ── 轻社区：浏览 / 点赞（读者匿名，靠 IP+UA 指纹去重）──

export interface SocialState {
  likes: number;
  liked: boolean;
}

export function fetchSocial(slug: string) {
  return webnovelRequest<SocialState>(`/social/${encodeURIComponent(slug)}`);
}

/** 记一次浏览（后端按访客指纹 6 小时去重，重复调用无害） */
export function recordView(slug: string) {
  return webnovelRequest<{ ok: boolean; counted: boolean }>(
    `/social/${encodeURIComponent(slug)}/view`,
    { method: 'POST' },
  );
}

/** 点赞 / 取消点赞（同一访客切换） */
export function toggleLike(slug: string) {
  return webnovelRequest<{ ok: boolean; liked: boolean; likes: number }>(
    `/social/${encodeURIComponent(slug)}/like`,
    { method: 'POST' },
  );
}

// ── 读后评论（简版，匿名）──

export interface NovelComment {
  id: number;
  nickname: string;
  content: string;
  created_at: number;
}

export function fetchComments(slug: string, limit = 50) {
  return webnovelRequest<{ items: NovelComment[] }>(
    `/social/${encodeURIComponent(slug)}/comments?limit=${limit}`,
  );
}

export function postComment(slug: string, content: string, nickname?: string) {
  return webnovelRequest<{ ok: boolean; item: NovelComment }>(
    `/social/${encodeURIComponent(slug)}/comments`,
    { method: 'POST', body: JSON.stringify({ content, nickname }) },
  );
}

// ── 站内信 ──

export interface MailItem {
  id: number;
  title: string;
  body: string;
  amount: number;
  created_at: number;
  /** active / archived —— 管理端列表会带，用户端只返回 active */
  status?: string;
  /** 限领人数，0 = 不限 */
  max_claims?: number;
  /** 用户端字段：我是否已领取 */
  claimed?: boolean;
  /** 用户端字段：剩余名额（不限时为 null） */
  remaining?: number | null;
  /** 用户端字段：名额已抢光且自己没领到 */
  sold_out?: boolean;
}

export function fetchMails() {
  return webnovelRequest<{ items: MailItem[]; unclaimed_count: number }>('/mails', { auth: true });
}

export function claimMail(id: number) {
  return webnovelRequest<{ ok: boolean; amount: number; balance: number }>(`/mails/${id}/claim`, {
    method: 'POST',
    auth: true,
  });
}

// ── 管理端 ──

export interface AdminStats {
  novels: {
    total: number; published: number; draft: number; takedown: number;
    authors: number; views: number; likes: number;
  };
  points: {
    holders: number; circulating: number; purchased: number; spent: number;
    orders: number; order_amount: number; token_per_point: number;
    revenue: number; unit_price: number;
  };
  windows: Record<
    'today' | 'yesterday' | 'd7' | 'd30',
    {
      ai_calls: number; ai_ok: number; ai_failed: number; ai_cost: number; ai_users: number;
      novels: number; orders: number; order_points: number; order_amount: number;
      /** 该时段收入（元）；爱发电未回传金额时按单价折算 */
      revenue: number;
    }
  >;
  top_users: { user_id: number; calls: number; cost: number }[];
  recent_errors: { user_id: number; error: string; created_at: string }[];
}

export function fetchAdminStats() {
  return webnovelRequest<AdminStats>('/admin/stats', { auth: true });
}

/** 收入流水：逐单列出 + 合计（单价默认 ¥6/份） */
export interface OrderLedger {
  items: {
    order_id: string;
    user_id: number;
    amount: number;
    points: number;
    revenue: number;
    created_at: string;
  }[];
  unit_price: number;
  total_orders: number;
  total_revenue: number;
  total_points: number;
}

export function fetchAdminOrders(limit = 50) {
  return webnovelRequest<OrderLedger>(`/admin/orders?limit=${limit}`, { auth: true });
}

export function givePoints(userId: number, points: number) {
  return webnovelRequest<{ ok: boolean; user_id: number; granted: number; balance: number }>(
    '/admin/wallets/give',
    { method: 'POST', auth: true, body: JSON.stringify({ user_id: userId, points }) },
  );
}

export function fetchAdminMails() {
  return webnovelRequest<{ items: (MailItem & { claim_count: number })[] }>('/admin/mails', {
    auth: true,
  });
}

export function createAdminMail(input: {
  title: string;
  body?: string;
  amount?: number;
  /** 限领人数，0 或省略 = 不限 */
  max_claims?: number;
}) {
  return webnovelRequest<MailItem>('/admin/mails', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  });
}

export function archiveAdminMail(id: number) {
  return webnovelRequest<{ ok: boolean }>(`/admin/mails/${id}`, { method: 'DELETE', auth: true });
}

// ── 运行时配置（计费口径）──

/** 字段说明由后端给，前端按它渲染 —— 加设置项不用改前端 */
export interface AdminSettingField {
  key: string;
  label: string;
  hint: string;
  min: number;
  max: number;
}

export interface AdminSettings {
  values: Record<string, number>;
  fields: AdminSettingField[];
}

export function fetchAdminSettings() {
  return webnovelRequest<AdminSettings>('/admin/settings', { auth: true });
}

/** 改完立刻生效（后端存库不重启），返回改后的全量值 */
export function saveAdminSettings(patch: Record<string, number>) {
  return webnovelRequest<{ ok: boolean; applied: Record<string, number>; values: Record<string, number> }>(
    '/admin/settings',
    { method: 'PUT', auth: true, body: JSON.stringify(patch) },
  );
}

// ── 全站作品管理 ──

export interface AdminNovelRow {
  id: number;
  slug: string;
  title: string;
  author_id: number;
  author_name: string;
  anonymous: number;
  ai_generated: number;
  ai_locked: number;
  status: NovelStatus;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export function fetchAdminNovels(params: { status?: string; q?: string; page?: number } = {}) {
  const sp = new URLSearchParams();
  if (params.status) sp.set('status', params.status);
  if (params.q) sp.set('q', params.q);
  sp.set('page', String(params.page || 1));
  sp.set('pageSize', '20');
  return webnovelRequest<{ total: number; page: number; pageSize: number; items: AdminNovelRow[] }>(
    `/admin/novels?${sp.toString()}`,
    { auth: true },
  );
}

/** 强制改状态（转草稿 / 下架 / 恢复发布）。理由会随统一推送发给作者 */
export function moderateNovel(slug: string, status: NovelStatus, reason: string) {
  return webnovelRequest<{ ok: boolean; changed: boolean; status: NovelStatus }>(
    `/admin/novels/${slug}/status`,
    { method: 'POST', auth: true, body: JSON.stringify({ status, reason }) },
  );
}

/**
 * 图片 URL 三种形态：
 * - `http(s)://…` 已是公网 URL → 原样
 * - `/api/images/xxx` 本地磁盘旧路径（历史作品/未配 S3 的回退）→ 同源代理 `/webnovel/api/images/xxx`
 * - 裸 S3 key（`cf-webnovel/usr/…`）→ 拼公网 URL（与论坛同桶同端点，webnovel 换目录）
 * 别把全权论坛 token 拼进图片 URL（见文件头注释）。
 */
const WEB_S3_PUBLIC_BASE = 'https://ny-1s.enzonix.com/bucket-1812-2434';

export function webnovelImageUrl(p: string | null | undefined): string {
  if (!p) return '';
  // 只认**我们自己存储**里的图：编辑器已改成仅支持上传，这里再兜一道 ——
  // 任意外链（尤其 data:/javascript: 和第三方可执行 SVG）等于把外部内容注进读者页面。
  if (p.startsWith('/api/images/')) return `/webnovel${p}`;
  if (/^cf-webnovel\//.test(p)) return `${WEB_S3_PUBLIC_BASE}/${p}`;
  // 历史数据里可能存过我们自己 S3 的完整 URL，放行；其余一律丢弃
  if (p.startsWith(WEB_S3_PUBLIC_BASE)) return p;
  return '';
}

/**
 * 上传图片：先用 browser-image-compression 压缩（参数与论坛非头像一致：
 * maxSizeMB 0.5 / maxWidthOrHeight 1200 / quality 0.82 / 保留原格式），
 * 再 multipart 传 /webnovel/api/images → 返回裸 S3 key（或本地回退路径）。
 */
export async function uploadImage(file: File): Promise<string> {
  let target: File = file;
  if (file.type.startsWith('image/')) {
    try {
      const imageCompression = (await import('browser-image-compression')).default;
      target = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        initialQuality: 0.82,
        fileType: file.type,
      });
    } catch {
      // 压缩失败就用原图，让后端兜底
    }
  }
  const form = new FormData();
  form.append('image', target);
  const token = getToken();
  const res = await fetch(`${BASE}/images`, {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    let message = '上传失败';
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) message = j.error;
    } catch {}
    throw new WebnovelApiError(message, res.status);
  }
  const j = (await res.json()) as { path: string };
  return j.path;
}
