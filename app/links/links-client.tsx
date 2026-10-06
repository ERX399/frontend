'use client';

import { useEffect, useMemo, useState } from 'react';
import { Form, Link, useSearchParams } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { Pagination } from '@/components/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { siteConfig } from '@/lib/config/site';

interface Friend {
  name: string;
  avatar: string | null;
  description?: string;
  url: string;
  vip?: boolean;
  backlink?: string;
}

interface Sponsor {
  name: string;
  avatar: string | null;
  date: string;
  amount: string;
}

const API = import.meta.env.VITE_FRIENDS_DOMAIN || 'https://raw-f.520pro.top';

const FRIENDS_REPO = 'https://github.com/ERX399/friends-data';

const AFDIAN_URL =
  siteConfig.bio.links.find((l) => l.name === '爱发电')?.url || 'https://www.ifdian.net/a/ERX399';

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

/** 头像块：有图出图，图挂了或没有就退回首字。尺寸/圆角由调用点控制 */
function Avatar({
  name,
  src,
  sizeClass,
  radiusClass,
  fallbackClass,
  ringClass,
  failed,
  onFail,
}: {
  name: string;
  src?: string;
  sizeClass: string;
  radiusClass: string;
  fallbackClass: string;
  ringClass?: string;
  failed: boolean;
  onFail: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className={`relative flex shrink-0 select-none ${sizeClass}`} aria-hidden="true">
      <span className={`flex size-full items-center justify-center bg-muted text-muted-foreground ${radiusClass} ${fallbackClass}`}>
        {name.charAt(0)}
      </span>
      {src && !failed && (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={onFail}
          className={`absolute inset-0 size-full object-cover ${radiusClass} ${ringClass ?? ''} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
        />
      )}
    </span>
  );
}

export function LinksClient({
  initialFriends,
  initialSponsors,
}: {
  initialFriends?: Friend[];
  initialSponsors?: Sponsor[];
} = {}) {
  const [friends, setFriends] = useState<Friend[]>(initialFriends ?? []);
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors ?? []);
  const [loadingFriends, setLoadingFriends] = useState(!initialFriends);
  const [loadingSponsors, setLoadingSponsors] = useState(!initialSponsors);
  const [failedFriends, setFailedFriends] = useState<Set<string>>(new Set());
  const [failedSponsors, setFailedSponsors] = useState<Set<string>>(new Set());
  const itemsPerPage = 12;

  // 翻页与搜索都挂在 URL 上：此前是 useState + onClick 按钮，禁用 JS 时
  // 分页条完全点不动，第 13 位以后的友链谁也看不到（爬虫也发现不了）。
  // 列表本身由 loader 服务端直出，所以只要读 searchParams 就能无 JS 分页。
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';
  const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  useEffect(() => {
    if (initialFriends) return; // 已由 loader 服务端取好
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
        setLoadingFriends(false);
      })
      .catch(() => setLoadingFriends(false));
  }, []);

  useEffect(() => {
    if (initialSponsors) return; // 已由 loader 服务端取好
    fetch(`${API}/sponsors.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Sponsor[]>;
      })
      .then((data) => {
        setSponsors(data as Sponsor[]);
        setLoadingSponsors(false);
      })
      .catch(() => setLoadingSponsors(false));
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
    return qs ? `/links?${qs}` : '/links';
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      {/* 标题走 sr-only：参考站 AcoFork 的 h1 只给屏幕阅读器，页面上直接进区块，
          不做「大标题 + 副标题」的门面。视觉层级交给各 section 自己的 h2 */}
      <h1 className="sr-only">友情链接与赞助支持</h1>

      <div className="flex flex-col gap-10 md:gap-14">
        <FriendsSection
          friends={friends}
          filtered={filteredFriends}
          paginated={paginatedFriends}
          loading={loadingFriends}
          failed={failedFriends}
          setFailed={setFailedFriends}
          searchQuery={searchQuery}
          currentPage={currentPage}
          totalPages={totalPages}
          pageHref={pageHref}
        />

        <SponsorsSection
          sponsors={sponsors}
          loading={loadingSponsors}
          failed={failedSponsors}
          setFailed={setFailedSponsors}
        />

        <ApplyTutorial />
      </div>
    </div>
  );
}

function SponsorsSection({
  sponsors,
  loading,
  failed,
  setFailed,
}: {
  sponsors: Sponsor[];
  loading: boolean;
  failed: Set<string>;
  setFailed: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold tracking-tight md:text-2xl">赞助支持</h2>

      {loading ? (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(17rem,1fr))]">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[56px]" />
          ))}
        </div>
      ) : sponsors.length === 0 ? (
        <p className="border-y border-border py-12 text-center text-muted-foreground">
          暂无赞助记录
        </p>
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(17rem,1fr))]">
          {sponsors.map((sponsor, i) => {
            const avatar = safeHttpUrl(sponsor.avatar);
            return (
              // 名字不是唯一键：同名的两笔赞助会撞 key 导致渲染异常，带上序号
              <div key={`${sponsor.name}-${i}`} className="flex items-center gap-3 border border-border bg-card p-3">
                <Avatar
                  name={sponsor.name}
                  src={avatar}
                  sizeClass="size-8"
                  radiusClass="rounded-lg"
                  fallbackClass="text-sm"
                  failed={failed.has(sponsor.name)}
                  onFail={() => setFailed((prev) => new Set(prev).add(sponsor.name))}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{sponsor.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {sponsor.amount} · {sponsor.date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FriendsSection({
  friends,
  filtered,
  paginated,
  loading,
  failed,
  setFailed,
  searchQuery,
  currentPage,
  totalPages,
  pageHref,
}: {
  friends: Friend[];
  filtered: Friend[];
  paginated: Friend[];
  loading: boolean;
  failed: Set<string>;
  setFailed: React.Dispatch<React.SetStateAction<Set<string>>>;
  searchQuery: string;
  currentPage: number;
  totalPages: number;
  pageHref: (page: number) => string;
}) {
  return (
    <section id="friend-links" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">友情链接</h2>
          {/* 真 <a href="#add-site-tutorial">：无 JS 也能跳到教程（原生锚点），
              有 JS 时由下面的 onClick 接管做平滑滚动。用按钮的话禁 JS 就死了 */}
          <a
            href="#add-site-tutorial"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById('add-site-tutorial')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="inline-flex h-7 shrink-0 items-center gap-1 border border-border bg-foreground/5 px-3 text-sm font-medium transition-colors hover:bg-foreground/15"
          >
            <Icon icon="lucide:link" className="size-4" />
            <span>申请友链</span>
            <Icon icon="lucide:chevron-down" className="size-4" />
          </a>
        </div>

        {/* GET 表单：无 JS 时回车整页刷新出结果，有 JS 时 RR 走客户端导航。
            换搜索词就等于回到第 1 页 —— 表单里没有 page 字段 */}
        <Form method="get" action="/links" className="relative w-full sm:max-w-xs">
          <label className="relative block w-full">
            <span className="sr-only">搜索友链</span>
            <Icon
              icon="lucide:search"
              className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
            />
            <input
              key={searchQuery}
              type="search"
              name="q"
              placeholder="搜索站点"
              aria-label="搜索友链"
              defaultValue={searchQuery}
              className="h-8 w-full min-w-0 border border-input bg-input/40 py-1 pe-3 ps-9 text-base outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring md:text-sm"
            />
          </label>
        </Form>
      </div>

      {loading ? (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(17rem,1fr))]">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-[56px]" />
          ))}
        </div>
      ) : friends.length === 0 ? (
        <p className="border-y border-border py-12 text-center text-muted-foreground">暂无友链</p>
      ) : filtered.length === 0 ? (
        <p className="border-y border-border py-12 text-center text-muted-foreground">
          没有找到匹配「{searchQuery}」的友链
        </p>
      ) : (
        <>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(17rem,1fr))]">
            {paginated.map((friend, i) => {
              const href = safeHttpUrl(friend.url);
              const avatar = safeHttpUrl(friend.avatar);
              return (
                <a
                  // url 是投稿人可控的，两条相同 url 的友链会撞 key，带上序号
                  key={`${friend.url}-${i}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex items-center gap-3 border p-3 transition-colors ${
                    friend.vip
                      ? 'border-amber-500/40 bg-amber-400/5 hover:bg-amber-400/10'
                      : 'border-border bg-card hover:border-foreground/40'
                  }`}
                >
                  <Avatar
                    name={friend.name}
                    src={avatar}
                    sizeClass="size-8"
                    radiusClass="rounded-lg"
                    fallbackClass="text-sm"
                    ringClass={friend.vip ? 'ring-1 ring-amber-500/60' : undefined}
                    failed={failed.has(friend.url)}
                    onFail={() => setFailed((prev) => new Set(prev).add(friend.url))}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{friend.name}</span>
                      {friend.vip && (
                        <span className="shrink-0 border border-amber-500/50 bg-amber-400/20 px-1 py-px text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                          VIP
                        </span>
                      )}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {friend.description || friend.url}
                    </span>
                  </div>
                  <Icon
                    icon="lucide:external-link"
                    className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                  />
                </a>
              );
            })}
          </div>

          <Pagination page={currentPage} pageCount={totalPages} hrefFor={pageHref} />
        </>
      )}
    </section>
  );
}

function ApplyTutorial() {
  const steps = [
    {
      text: (
        <>
          打开{' '}
          <a
            href={`${FRIENDS_REPO}/tree/main/data/friends`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-4"
          >
            ERX399/friends-data
          </a>{' '}
          的 <code className="rounded bg-muted px-1.5 py-0.5 text-xs">data/friends</code> 目录
        </>
      ),
    },
    {
      text: (
        <>
          点右上角 <span className="font-medium text-foreground">Create new file</span>，
          文件名以 <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.json</code> 结尾
          （例如 <code className="rounded bg-muted px-1.5 py-0.5 text-xs">我的博客.json</code>）
        </>
      ),
    },
    {
      text: (
        <>
          粘贴右侧模板并替换成你的信息，其中 <span className="font-medium text-foreground">backlink</span> 必填 ——
          系统会访问你的友链页，确认包含本站链接
        </>
      ),
    },
    { text: <>提交 Pull Request，自动校验通过后部署上线，无需等待人工审核</> },
  ];

  return (
    <section
      id="add-site-tutorial"
      /* scroll-mt：顶栏是 sticky 的，锚点跳转要留出它的高度，否则标题会被压住 */
      className="scroll-mt-[calc(var(--site-header-height)+1rem)] border border-border bg-card"
    >
      <div className="grid gap-3 p-4">
        <h2 className="text-2xl font-medium tracking-tight">如何申请友链</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Fork 数据仓库，在 <code className="rounded bg-muted px-1.5 py-0.5 text-xs">data/friends/</code> 下添加
          JSON，提交 Pull Request。自动流程会检查格式与双向链接，通过后就会出现在上面的列表里。
        </p>
      </div>

      <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-2 lg:gap-6">
        <div className="flex flex-col gap-3">
          <ol className="grid gap-3" aria-label="友链申请步骤">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-6">
                <span className="flex size-6 shrink-0 items-center justify-center bg-muted font-mono text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <span>{step.text}</span>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-2">
            <a
              href={FRIENDS_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center gap-1 border border-border bg-foreground/5 px-3 text-sm font-medium transition-colors hover:bg-foreground/15"
            >
              <span>查看仓库说明</span>
              <Icon icon="lucide:external-link" className="size-4" />
            </a>
            <a
              href={`${FRIENDS_REPO}/issues/new`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center gap-1 border border-border bg-foreground/5 px-3 text-sm font-medium transition-colors hover:bg-foreground/15"
            >
              <span>遇到问题提 Issue</span>
              <Icon icon="lucide:external-link" className="size-4" />
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">data/friends/我的博客.json</span>
            <span className="text-xs text-muted-foreground">JSON</span>
          </div>
          <pre className="overflow-x-auto border border-border bg-background p-3 text-xs leading-5">
{`{
  "name": "你的站点名称",
  "avatar": "https://你的头像URL（可选）",
  "description": "简短描述（可选）",
  "url": "https://你的网站URL",
  "backlink": "https://你的网站/友链页（必填）"
}`}</pre>
          <p className="text-xs leading-5 text-muted-foreground">
            <span className="font-medium text-foreground">backlink</span> 用于双向链接验证：系统会访问你的友链页，
            检查是否包含 <code className="rounded bg-muted px-1 py-0.5">href={siteConfig.url}</code>，通过后自动合并
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Icon icon="lucide:heart" className="size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            如果你是要
            <Link to="/posts/pin" className="mx-1 font-medium text-foreground underline underline-offset-4">
              加群
            </Link>
            ，请前往置顶文章使用爱发电赞助。这里只是纯赞助，无收益。
          </p>
        </div>
        <a
          href={AFDIAN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 shrink-0 items-center gap-1 border border-border bg-foreground/5 px-3 text-sm font-medium transition-colors hover:bg-foreground/15"
        >
          <span>前往爱发电</span>
          <Icon icon="lucide:external-link" className="size-4" />
        </a>
      </div>
    </section>
  );
}
