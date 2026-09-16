import { siteConfig } from '@/lib/config/site';

const { src, shareToken } = siteConfig.analytics.umami;

/** umami 实例根地址（去掉了 /script.js） */
const API_BASE = src.replace(/\/script\.js$/, '');

interface ShareContext {
  websiteId: string;
  token: string;
}

let shareContextCache: ShareContext | null = null;

/**
 * 所有 umami 请求共用一道闸门：最快 10ms 放行一次，同一 URL 的并发请求合并成一个。
 * 作用是让多组件同时挂载时不会一起打过去，且重复请求不重复发。
 */
const MIN_REQUEST_GAP_MS = 10;

let lastRequestAt = 0;
let gateTail: Promise<unknown> = Promise.resolve();
const inflight = new Map<string, Promise<unknown>>();

function waitTurn(): Promise<void> {
  const next = gateTail
    .then(() => {
      const wait = MIN_REQUEST_GAP_MS - (Date.now() - lastRequestAt);
      return wait > 0 ? new Promise<void>((resolve) => setTimeout(resolve, wait)) : undefined;
    })
    .then(() => {
      lastRequestAt = Date.now();
    });
  gateTail = next.catch(() => {});
  return next;
}

async function requestJson<T>(url: string, extra: Record<string, string> = {}): Promise<T | null> {
  const hit = inflight.get(url);
  if (hit) return hit as Promise<T | null>;
  const task = (async () => {
    try {
      await waitTurn();
      const res = await fetch(url, { headers: { Accept: 'application/json', ...extra } });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  })();
  inflight.set(url, task);
  task.finally(() => {
    inflight.delete(url);
  });
  return task;
}

/**
 * 用 share token 换取 websiteId + JWT 访问令牌，并缓存（share token 有效期内复用）。
 * umami v3 的 share 只读接口除 x-umami-share-token 外，还需 x-umami-share-context 头。
 */
export async function getShareContext(): Promise<ShareContext | null> {
  if (shareContextCache) return shareContextCache;
  const data = await requestJson<ShareContext>(`${API_BASE}/api/share/${shareToken}`);
  if (data?.websiteId && data?.token) {
    shareContextCache = { websiteId: data.websiteId, token: data.token };
  }
  return shareContextCache;
}

/** umami 写入本站访问通常在一秒内完成，留这个间隔补读一次就够，不做轮询 */
const PAGEVIEW_COMMIT_REREAD_MS = 3000;

export function loadPageviews(
  read: () => Promise<number | null>,
  apply: (n: number) => void,
): () => void {
  let cancelled = false;
  const run = () => {
    read()
      .then((n) => {
        if (!cancelled && typeof n === 'number') apply(n);
      })
      .catch(() => {});
  };
  run();
  const timer = setTimeout(run, PAGEVIEW_COMMIT_REREAD_MS);
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}

/** endAt 只精确到秒：同秒内的并发请求 URL 一致，闸门才能认出并合并它们 */
const endAtNow = () => String(Math.floor(Date.now() / 1000) * 1000);

const shareHeaders = (ctx: ShareContext) => ({
  'x-umami-share-token': ctx.token,
  'x-umami-share-context': '1',
});

/**
 * 获取单篇文章访问量。
 * path 精确匹配（v3 需 eq. 前缀），不带尾斜杠，因为 umami 把
 * /posts/x 和 /posts/x/ 视为两个不同路径，站内路由用的是前者。
 */
export async function getPostPageviews(slug: string): Promise<number | null> {
  const ctx = await getShareContext();
  if (!ctx) return null;
  const params = new URLSearchParams({
    startAt: '0',
    endAt: endAtNow(),
    unit: 'hour',
    timezone: 'Asia/Shanghai',
    path: `eq./posts/${slug}`,
    compare: 'prev',
  });
  const data = await requestJson<{ pageviews?: unknown }>(
    `${API_BASE}/api/websites/${ctx.websiteId}/stats?${params.toString()}`,
    shareHeaders(ctx),
  );
  return typeof data?.pageviews === 'number' ? data.pageviews : null;
}

/**
 * 获取全站总浏览量（不带 path，即整个 website 的 pageviews）。
 */
export async function getSitePageviews(): Promise<number | null> {
  const ctx = await getShareContext();
  if (!ctx) return null;
  const params = new URLSearchParams({
    startAt: '0',
    endAt: endAtNow(),
    unit: 'hour',
    timezone: 'Asia/Shanghai',
    compare: 'prev',
  });
  const data = await requestJson<{ pageviews?: unknown }>(
    `${API_BASE}/api/websites/${ctx.websiteId}/stats?${params.toString()}`,
    shareHeaders(ctx),
  );
  return typeof data?.pageviews === 'number' ? data.pageviews : null;
}
