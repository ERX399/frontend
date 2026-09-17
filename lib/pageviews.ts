import { siteConfig } from '@/lib/config/site';

/**
 * 浏览量改从 u.520（Cloudflare 边缘缓存 1 秒）读：
 * 本站总量是 /data.json，单篇是 /pv/<slug>.json，都是固定 URL、固定跨域头。
 * u.520 自己每秒从 umami 库里取一次数，访客只碰边缘，umami 不会随访客数受压。
 */
const PV_BASE = siteConfig.analytics.pageviews.api;

/** 同一 URL 的并发请求合并成一个，多组件同时挂载时不重复发 */
const inflight = new Map<string, Promise<unknown>>();

async function requestJson<T>(url: string, missing: T | null = null): Promise<T | null> {
  const hit = inflight.get(url);
  if (hit) return hit as Promise<T | null>;
  const task = (async () => {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.status === 404) return missing;
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

/** umami 写入本站访问通常在一秒内完成，留这个间隔补读一次，把自己的这次访问也算进去 */
const PAGEVIEW_COMMIT_REREAD_MS = 3000;

/** 停留期间每 0.5 秒补读一次，页面切到后台就停下，切回来立刻补读 */
const PAGEVIEW_POLL_MS = 500;

export function loadPageviews(
  read: () => Promise<number | null>,
  apply: (n: number) => void,
): () => void {
  let cancelled = false;
  let poll: ReturnType<typeof setInterval> | null = null;
  const run = () => {
    if (cancelled) return;
    read()
      .then((n) => {
        if (!cancelled && typeof n === 'number') apply(n);
      })
      .catch(() => {});
  };
  const stop = () => {
    if (poll) clearInterval(poll);
    poll = null;
  };
  const start = () => {
    stop();
    if (cancelled || typeof document === 'undefined' || document.visibilityState === 'hidden') return;
    poll = setInterval(run, PAGEVIEW_POLL_MS);
  };
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      stop();
    } else {
      run();
      start();
    }
  };

  run();
  const reread = setTimeout(run, PAGEVIEW_COMMIT_REREAD_MS);
  start();
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    cancelled = true;
    clearTimeout(reread);
    stop();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/** 全站总浏览量；读不到返回 null，调用方保留上一次的值，不清零 */
export async function getSitePageviews(): Promise<number | null> {
  const data = await requestJson<{ total?: number }>(`${PV_BASE}/data.json`);
  return typeof data?.total === 'number' ? data.total : null;
}

/** 单篇文章浏览量；没被访问过的路径在 umami 里没有记录，u.520 也就不生成文件，按 0 算 */
export async function getPostPageviews(slug: string): Promise<number | null> {
  const data = await requestJson<{ n?: number }>(
    `${PV_BASE}/pv/${encodeURIComponent(slug)}.json`,
    { n: 0 },
  );
  return typeof data?.n === 'number' ? data.n : null;
}
