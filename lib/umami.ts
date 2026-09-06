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
 * 用 share token 换取 websiteId + JWT 访问令牌，并缓存（share token 有效期内复用）。
 * umami v3 的 share 只读接口除 x-umami-share-token 外，还需 x-umami-share-context 头。
 */
export async function getShareContext(): Promise<ShareContext | null> {
  if (shareContextCache) return shareContextCache;
  try {
    const res = await fetch(`${API_BASE}/api/share/${shareToken}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.websiteId && data?.token) {
      shareContextCache = { websiteId: data.websiteId, token: data.token };
    }
    return shareContextCache;
  } catch {
    return null;
  }
}

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
    endAt: String(Date.now()),
    unit: 'hour',
    timezone: 'Asia/Shanghai',
    path: `eq./posts/${slug}`,
    compare: 'prev',
  });
  try {
    const res = await fetch(
      `${API_BASE}/api/websites/${ctx.websiteId}/stats?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
          'x-umami-share-token': ctx.token,
          'x-umami-share-context': '1',
        },
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.pageviews === 'number' ? data.pageviews : null;
  } catch {
    return null;
  }
}

/**
 * 获取全站总浏览量（不带 path，即整个 website 的 pageviews）。
 */
export async function getSitePageviews(): Promise<number | null> {
  const ctx = await getShareContext();
  if (!ctx) return null;
  const params = new URLSearchParams({
    startAt: '0',
    endAt: String(Date.now()),
    unit: 'hour',
    timezone: 'Asia/Shanghai',
    compare: 'prev',
  });
  try {
    const res = await fetch(
      `${API_BASE}/api/websites/${ctx.websiteId}/stats?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
          'x-umami-share-token': ctx.token,
          'x-umami-share-context': '1',
        },
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.pageviews === 'number' ? data.pageviews : null;
  } catch {
    return null;
  }
}
