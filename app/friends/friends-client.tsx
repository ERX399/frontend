'use client';

import { useEffect, useMemo, useState } from 'react';
import { Form, Link, useSearchParams } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { buttonVariants } from '@/components/ui/button';
import { Pagination } from '@/components/pagination';
import { Skeleton } from '@/components/ui/skeleton';

interface Friend {
  name: string;
  avatar: string | null;
  description?: string;
  url: string;
  vip?: boolean;
  backlink?: string;
}

const API = import.meta.env.VITE_FRIENDS_DOMAIN || 'https://raw-f.520pro.top';

/**
 * 友链数据来自社区 PR（friends-data），`url` / `avatar` 是**投稿人可控**的字符串。
 * 直接甩进 `href` 就等于把 `javascript:` / `data:text/html` 的执行权交出去 ——
 * 一次合错的 PR 就是一个存储型 XSS。这里只放行 http/https，其余一律当没有链接：
 * 卡片仍然渲染（不至于因为一条脏数据整块消失），但不再可点。
 */
function safeHttpUrl(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : undefined;
  } catch {
    // 相对地址、协议相对地址（//evil.com）、纯域名都走这里 —— 一律不放行
    return undefined;
  }
}

export function FriendsClient({ initial }: { initial?: Friend[] } = {}) {
  const [friends, setFriends] = useState<Friend[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const itemsPerPage = 12;

  // 翻页与搜索都挂在 URL 上：此前是 useState + onClick 按钮，禁用 JS 时
  // 分页条完全点不动，第 13 位以后的友链谁也看不到（爬虫也发现不了）。
  // 列表本身由 loader 服务端直出，所以只要读 searchParams 就能无 JS 分页。
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';
  const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  useEffect(() => {
    if (initial) return; // 已由 loader 服务端取好
    fetch(`${API}/friends.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Friend[]>;
      })
      .then((data) => {
        const sorted = (data as Friend[]).sort((a, b) => {
          if (a.vip && !b.vip) return -1;
          if (!a.vip && b.vip) return 1;
          return 0;
        });
        setFriends(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q)),
    );
  }, [friends, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredFriends.length / itemsPerPage));
  // 手改 URL 到越界页码时夹回最后一页，而不是给一个空列表
  const currentPage = Math.min(requestedPage, totalPages);
  const paginatedFriends = useMemo(
    () => filteredFriends.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredFriends, currentPage],
  );

  /** 分页链接：保留当前搜索词，第 1 页不写 page 参数（URL 干净些） */
  function pageHref(page: number): string {
    const p = new URLSearchParams();
    if (searchQuery) p.set('q', searchQuery);
    if (page > 1) p.set('page', String(page));
    const qs = p.toString();
    return qs ? `/friends?${qs}` : '/friends';
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold">友情链接</h1>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 border-t border-border md:border-l">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 border-b border-border md:border-r py-4 md:p-4">
              <Skeleton className="h-16 w-16 shrink-0" />
              <div className="flex-1 space-y-2.5 py-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-4xl font-bold">友情链接</h1>
        <p className="text-lg text-muted-foreground">
          这里是我的朋友们，欢迎互相访问交流
        </p>
      </div>

      {/* 有底色的块窄屏走 full-bleed：-mx-4 让背景铺到屏幕边缘，再用 px-4
          把文字推回与页面其它内容同一条竖线上 —— 只去边框不补内边距的话，
          文字会直接贴在色块边缘上。sm 起恢复正常盒子 */}
      <div className="mb-8 -mx-4 border-y border-primary/30 bg-primary/5 px-4 py-4 sm:mx-0 sm:border">
        <div className="mb-2 flex items-start gap-3">
          <Icon icon="mdi:link-variant" className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-primary">申请友链</p>
            <p className="text-sm text-primary/80">
              直接在 GitHub 上创建文件，自动验证通过后就会出现在下方列表中。
            </p>
          </div>
        </div>
        <ol className="ml-8 mt-2 list-decimal space-y-1 text-sm text-muted-foreground">
          <li>
            打开{' '}
            <a
              href="https://github.com/ERX399/friends-data/tree/main/data/friends"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              ERX399/friends-data/data/friends
            </a>{' '}
            ，点击右上角 <span className="font-medium text-foreground">···</span> → <span className="font-medium text-foreground">Create new file</span>
          </li>
          <li>
            <span className="font-medium text-foreground">Name your file</span> 处填入文件名，必须以
            <code className="rounded bg-muted px-1 py-0.5">.json</code> 结尾（例如
            <code className="rounded bg-muted px-1 py-0.5">我的博客.json</code>）
          </li>
          <li>粘贴以下内容，替换成你的信息：</li>
        </ol>
        <pre className="mx-8 mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
{`{
  "name": "你的站点名称",
  "avatar": "https://你的头像URL（可选）",
  "description": "简短描述（可选）",
  "url": "https://你的网站URL",
  "backlink": "https://你的网站/友链页（必填）"
}`}</pre>
        <ul className="ml-8 mt-2 space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">avatar</span> 可选。提供后将显示头像，否则显示首字母
          </li>
          <li>
            <span className="font-medium text-foreground">backlink</span> 必填。填写后系统会验证你的友链页是否包含本站链接（
            <code className="rounded bg-muted px-1 py-0.5">href=https://520pro.top</code>），验证通过后自动合并
          </li>
          <li>
            如果 backlink 验证不通过，PR 不会自动合并，请确保你的友链页包含本站链接后 push 更新
          </li>
        </ul>
        <div className="ml-8 mt-3 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <Icon icon="mdi:lightbulb-outline" className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="text-xs text-amber-700">
            <p className="font-medium">双向链接验证</p>
            <p className="mt-0.5">
              填写 backlink 后，Action 会自动访问你的友链页，检查是否包含本站链接。
              通过后自动合并，无需等待人工审核。
            </p>
          </div>
        </div>
        <p className="ml-8 mt-2 text-xs text-muted-foreground">
          提交后 GitHub Actions 会自动检查头像和网站的可达性，通过后合并。
          如果有问题，请
          <a
            href="https://github.com/ERX399/friends-data/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            提 Issue
          </a>
          。
        </p>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-bold">友链列表 ({friends.length})</h2>

        {/* GET 表单：无 JS 时回车整页刷新出结果，有 JS 时 RR 走客户端导航。
            换搜索词就等于回到第 1 页 —— 表单里没有 page 字段 */}
        <Form method="get" action="/friends" className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Icon
              icon="mdi:magnify"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              key={searchQuery}
              type="text"
              name="q"
              placeholder="搜索标题或简介…"
              defaultValue={searchQuery}
              className="w-full border border-input bg-background py-2 pl-10 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <button
            type="submit"
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'shrink-0' })}
          >
            搜索
          </button>
          {searchQuery && (
            <Link
              to="/friends"
              aria-label="清空搜索"
              className={buttonVariants({ variant: 'ghost', size: 'icon-lg', className: 'shrink-0' })}
            >
              <Icon icon="mdi:close" className="size-4" />
            </Link>
          )}
        </Form>

        {friends.length === 0 ? (
          <p className="border-y border-border py-12 text-center text-muted-foreground">暂无友链</p>
        ) : filteredFriends.length === 0 ? (
          <p className="border-y border-border py-12 text-center text-muted-foreground">
            没有找到匹配「{searchQuery}」的友链
          </p>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 border-t border-border md:border-l">
              {paginatedFriends.map((friend) => {
                const href = safeHttpUrl(friend.url);
                const avatar = safeHttpUrl(friend.avatar);
                return (
                <a
                  key={friend.url}
                  // 协议不在白名单里就不给 href：卡片照常显示，只是点不动
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  /* VIP 原本靠外层 ring + shadow 标记，连体网格里 ring 会压在
                     相邻格子的分隔线上；改用底色 + 头像金环 + 皇冠角标标记 */
                  className={`block border-b border-border md:border-r py-4 md:p-4 transition-colors ${
                    friend.vip ? 'bg-amber-400/5 hover:bg-amber-400/10' : 'bg-background hover:bg-card'
                  }`}
                >
                  <div className="flex items-start gap-4">
                      <div className="relative h-16 w-16 shrink-0">
                        {avatar && !failedImages.has(friend.url) ? (
                          <img
                            src={avatar}
                            alt={friend.name}
                            referrerPolicy="no-referrer"
                            className={`h-16 w-16 rounded-full${
                              friend.vip ? ' ring-2 ring-amber-400/80' : ''
                            }`}
                            onError={() => {
                              setFailedImages((prev) => new Set(prev).add(friend.url));
                            }}
                          />
                        ) : (
                          <div
                            className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold${
                              friend.vip
                                ? ' bg-amber-100 text-amber-700 ring-2 ring-amber-400/80 dark:bg-amber-900/40 dark:text-amber-400'
                                : ' bg-muted text-muted-foreground'
                            }`}
                          >
                            {friend.name.charAt(0)}
                          </div>
                        )}
                        {friend.vip && (
                          <div className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-amber-400 text-white shadow">
                            <Icon icon="mdi:crown" className="size-3" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="mb-1 flex items-center gap-1.5 truncate font-semibold">
                          {friend.name}
                          {friend.vip && (
                            <span className="shrink-0 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">
                              VIP
                            </span>
                          )}
                        </div>
                        <div
                          className="line-clamp-2 text-sm text-muted-foreground"
                          title={friend.description || '暂无描述'}
                        >
                          {friend.description || '暂无描述'}
                        </div>
                      </div>
                  </div>
                </a>
                );
              })}
            </div>

            <Pagination page={currentPage} pageCount={totalPages} hrefFor={pageHref} />
          </>
        )}
      </div>
    </div>
  );
}
