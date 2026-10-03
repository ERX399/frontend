import { Link } from 'react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { coverThumb } from '@/lib/cover-thumb';
import { RandomCoverImg, isRandomCover } from '@/components/random-cover';
import { getPostPageviews } from '@/lib/pageviews';

const DOMAIN = import.meta.env.VITE_POSTS_DOMAIN || 'https://raw-posts.520pro.top';

interface PostEntry {
  slug: string;
  title: string;
  published: string;
  description: string;
  tags: string[];
  image?: string | null;
  pinned?: boolean;
  category?: string | null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function highlight(text: string, query: string): string {
  const safe = escapeHtml(text);
  if (!query) return safe;
  return safe.replace(
    new RegExp(`(${escapeRegExp(escapeHtml(query))})`, 'gi'),
    '<mark class="rounded-sm bg-amber-200 dark:bg-amber-800 px-0.5">$1</mark>',
  );
}

const PER_PAGE = 30;

interface PagePayload {
  page: number;
  perPage: number;
  total: number;
  pageCount: number;
  posts: PostEntry[];
}

/** 从任意 posts.json 响应中取出文章数组（兼容旧「数组」与新「索引对象」） */
function extractPosts(json: unknown): PostEntry[] {
  if (Array.isArray(json)) return json as PostEntry[];
  const posts = (json as { posts?: PostEntry[] } | null)?.posts;
  return Array.isArray(posts) ? posts : [];
}

function PostViews({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    getPostPageviews(slug).then((n) => {
      if (!cancelled && typeof n === 'number') setViews(n);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [slug]);
  if (views === null) return null;
  return (
    <>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Icon icon="mdi:eye-outline" className="size-3" />
        {views.toLocaleString()} 次浏览
      </span>
    </>
  );
}
function sortForDisplay(posts: PostEntry[]): PostEntry[] {
  return [...posts].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.published).getTime() - new Date(a.published).getTime();
  });
}

/** 分页控件的页码序列，窄化显示：1 … 4 5 [6] 7 8 … 20 */
function pageWindow(current: number, count: number): (number | '…')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  const out: (number | '…')[] = [0];
  const lo = Math.max(1, current - 1);
  const hi = Math.min(count - 2, current + 1);
  if (lo > 1) out.push('…');
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < count - 2) out.push('…');
  out.push(count - 1);
  return out;
}

export function PostsSearch() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);

  // 分页态：按需缓存每一页；元信息来自 posts-0.json / posts.json 索引
  const [pageCache, setPageCache] = useState<Map<number, PostEntry[]>>(new Map());
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);

  // 搜索用的全量索引：首次搜索时懒加载（分页模式下 posts-0 只含 30 篇）
  const [allPosts, setAllPosts] = useState<PostEntry[] | null>(null);
  // 旧后端（无分页文件）回退：把整份 posts.json 当作全量列表客户端分页
  const legacyRef = useRef(false);

  const fetchPage = useCallback(async (n: number): Promise<PostEntry[]> => {
    const res = await fetch(`${DOMAIN}/posts-${n}.json`);
    if (!res.ok) throw new Error(`page ${n} HTTP ${res.status}`);
    const data = (await res.json()) as PagePayload;
    setPageCount(data.pageCount);
    return data.posts;
  }, []);

  // 首屏：优先拉 posts-0.json（仅 30 篇）；不存在则回退到整份 posts.json
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPage(0)
      .then((posts) => {
        if (cancelled) return;
        setPageCache(new Map([[0, posts]]));
        setLoading(false);
      })
      .catch(() => {
        // 回退：老后端没有分页文件，一次性取全量并客户端分页
        fetch(`${DOMAIN}/posts.json`)
          .then((r) => r.json())
          .then((json) => {
            if (cancelled) return;
            legacyRef.current = true;
            const all = sortForDisplay(extractPosts(json));
            setAllPosts(all);
            setPageCount(Math.max(1, Math.ceil(all.length / PER_PAGE)));
            const cache = new Map<number, PostEntry[]>();
            for (let i = 0; i * PER_PAGE < all.length; i++) {
              cache.set(i, all.slice(i * PER_PAGE, (i + 1) * PER_PAGE));
            }
            setPageCache(cache);
            setLoading(false);
          })
          .catch(() => { if (!cancelled) setLoading(false); });
      });
    return () => { cancelled = true; };
  }, [fetchPage]);

  const goToPage = useCallback(
    (n: number) => {
      if (n < 0 || n >= pageCount || n === currentPage) return;
      if (pageCache.has(n)) {
        setCurrentPage(n);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setPageLoading(true);
      fetchPage(n)
        .then((posts) => {
          setPageCache((prev) => new Map(prev).set(n, posts));
          setCurrentPage(n);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(() => {})
        .finally(() => setPageLoading(false));
    },
    [pageCount, currentPage, pageCache, fetchPage],
  );

  const isSearching = query.trim().length > 0;

  // 首次搜索时懒加载全量索引（分页模式）；旧后端已持有全量
  useEffect(() => {
    if (!isSearching || allPosts !== null || legacyRef.current) return;
    fetch(`${DOMAIN}/posts.json`)
      .then((r) => r.json())
      .then((json) => setAllPosts(extractPosts(json)))
      .catch(() => setAllPosts([]));
  }, [isSearching, allPosts]);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const searchIndexReady = allPosts !== null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    if (!allPosts) return null; // 索引仍在加载

    const keywords = q.split(/\s+/).filter(Boolean);
    if (keywords.length === 0) return [];

    const scored = allPosts
      .map((post) => {
        const title = post.title.toLowerCase();
        const desc = post.description.toLowerCase();
        const tags = post.tags.join(' ').toLowerCase();

        let matches = 0;
        for (const kw of keywords) {
          const re = new RegExp(escapeRegExp(kw), 'g');
          const inTitle = (title.match(re) || []).length;
          const inDesc = (desc.match(re) || []).length;
          const inTags = (tags.match(re) || []).length;
          matches += inTitle * 5 + inDesc * 3 + inTags * 2;
        }

        return { ...post, score: matches };
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored;
  }, [query, allPosts]);

  const currentPosts = pageCache.get(currentPage) ?? [];

  function PostCard({
    post,
    showScore,
  }: {
    post: PostEntry & { score?: number };
    showScore?: boolean;
  }) {
    return (
      <Link
        to={`/posts/${post.slug}`}
        className="group flex h-full flex-col overflow-hidden border border-border bg-background transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-muted-foreground hover:bg-card hover:shadow-md"
      >
        {post.image && (
          <div className="h-28 w-full shrink-0 overflow-hidden bg-muted">
            {/* 与 app/routes/posts.tsx 的 PostCard 保持一致：走本站 /thumb 端点
                而不是原图，并补上 lazy / 尺寸 / 低优先级；随机封面标记则走 /api/random */}
            <RandomCoverImg
              src={isRandomCover(post.image) ? post.image : coverThumb(post.image, 480)}
              srcSet={`${coverThumb(post.image, 288)} 288w, ${coverThumb(post.image, 480)} 480w`}
              sizes="(min-width: 1280px) 256px, (min-width: 768px) 320px, 45vw"
              alt={post.title}
              width={480}
              height={288}
              className="size-full object-cover"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          </div>
        )}

        <article className="flex min-w-0 flex-1 flex-col gap-2 p-3">
          {showScore && post.score != null && (
            <span className="text-xs tabular-nums text-muted-foreground/80">
              {post.score} 匹配
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2 leading-none">
              {post.pinned && (
                <>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <Icon icon="mdi:pin" className="size-3" />
                    置顶
                  </span>
                  <span aria-hidden>·</span>
                </>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Icon icon="mdi:calendar" className="size-3" />
                <time dateTime={post.published}>
                  {post.published.slice(0, 10)}
                </time>
              </span>
              <PostViews slug={post.slug} />
              {post.category && (
                <>
                  <span aria-hidden>·</span>
                  <span className="text-xs text-muted-foreground">{post.category}</span>
                </>
              )}
            </div>

            {isSearching ? (
              <h2
                className="text-base font-medium group-hover:text-foreground transition-colors leading-snug"
                dangerouslySetInnerHTML={{ __html: highlight(post.title, query) }}
              />
            ) : (
              <h2 className="text-base font-medium group-hover:text-foreground transition-colors leading-snug line-clamp-2">
                {post.title}
              </h2>
            )}

            {post.description && (
              isSearching ? (
                <p
                  className="mt-1 text-sm text-muted-foreground line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: highlight(post.description, query) }}
                />
              ) : (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{post.description}</p>
              )
            )}
          </div>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex w-fit items-center bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>
      </Link>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="overflow-hidden border border-border">
            <Skeleton className="h-28 w-full" />
            <div className="space-y-2.5 p-3">
              <Skeleton className="h-3 w-3/5" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Search input */}
      <div className="relative mb-8">
        <Icon
          icon="mdi:magnify"
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`搜索文章… (${typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.platform) ? 'Cmd' : 'Ctrl'}+K)`}
          className="w-full h-10 pl-9 pr-4 rounded-lg border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {isSearching && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon icon="mdi:close" className="size-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {isSearching ? (
        !searchIndexReady ? (
          <p className="text-sm text-muted-foreground py-8 text-center">正在加载全部文章以供搜索…</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              找到 {results?.length ?? 0} 篇文章
            </p>
            {results && results.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                没有找到匹配的文章
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-3">
                {results?.map((post) => (
                  <PostCard key={post.slug} post={post} showScore />
                ))}
              </div>
            )}
          </>
        )
      ) : currentPosts.length === 0 ? (
        <p className="text-muted-foreground">暂无文章</p>
      ) : (
        <>
          <div className={`grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-3 transition-opacity ${pageLoading ? 'opacity-50' : ''}`}>
            {currentPosts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>

          {pageCount > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-1.5 font-mono text-sm" aria-label="分页导航">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0 || pageLoading}
                className="flex size-9 items-center justify-center border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label="上一页"
              >
                <Icon icon="mdi:chevron-left" className="size-4" />
              </button>
              {pageWindow(currentPage, pageCount).map((p, i) =>
                p === '…' ? (
                  <span key={`gap-${i}`} className="px-1 text-muted-foreground">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    disabled={pageLoading}
                    aria-current={p === currentPage ? 'page' : undefined}
                    className={`flex size-9 items-center justify-center border transition-colors ${
                      p === currentPage
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    {p + 1}
                  </button>
                ),
              )}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= pageCount - 1 || pageLoading}
                className="flex size-9 items-center justify-center border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label="下一页"
              >
                <Icon icon="mdi:chevron-right" className="size-4" />
              </button>
            </nav>
          )}
        </>
      )}
    </>
  );
}
