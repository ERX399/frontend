import { Link, useParams, useNavigate } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { renderMarkdown } from '@/lib/render-markdown';

const DOMAIN = import.meta.env.VITE_POSTS_DOMAIN || 'https://raw-posts.520pro.top';

interface Announcement {
  slug: string;
  title: string;
  description: string;
  published: string;
  category?: string;
  status?: string;
  body: string;
}

/**
 * 公告页：左侧列表 + 右侧详情。
 * 数据来自 blog-data 生成的 announcements.json（与 posts.json 同一域名）。
 * URL 形态 /announcements/<slug>，未指定 slug 时默认选中最新一条。
 */
export default function AnnouncementsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState<Announcement[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${DOMAIN}/announcements.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { announcements?: Announcement[] } | null) => {
        if (cancelled) return;
        setList(Array.isArray(json?.announcements) ? json.announcements : []);
      })
      .catch(() => { if (!cancelled) setList([]); });
    return () => { cancelled = true; };
  }, []);

  const current = useMemo(() => {
    if (!list || list.length === 0) return null;
    if (!slug) return list[0];
    return list.find((a) => a.slug === slug) ?? null;
  }, [list, slug]);

  // 访问 /announcements 时把 URL 补成最新一条，保证可分享、可刷新
  useEffect(() => {
    if (!slug && current) navigate(`/announcements/${current.slug}`, { replace: true });
  }, [slug, current, navigate]);

  const html = useMemo(() => (current ? renderMarkdown(current.body) : ''), [current]);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-72 lg:shrink-0">
          <h1 className="mb-3 border-b border-border pb-2 text-xl font-bold">公告列表</h1>
          {list === null ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无公告</p>
          ) : (
            <nav className="flex flex-col">
              {list.map((a) => {
                const active = current?.slug === a.slug;
                return (
                  <Link
                    key={a.slug}
                    to={`/announcements/${a.slug}`}
                    draggable={false}
                    className={
                      'flex flex-col gap-1 border-b border-border px-3 py-2.5 transition-colors ' +
                      (active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-card')
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {a.category && <span className="text-foreground/80">{a.category}</span>}
                      {a.status && (
                        <span className="border border-border px-1 text-[0.6875rem]">{a.status}</span>
                      )}
                      <time dateTime={a.published} className="ml-auto tabular-nums">
                        {a.published.slice(0, 10)}
                      </time>
                    </div>
                    <span className="text-sm font-medium leading-snug">{a.title}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </aside>

        <article className="min-w-0 flex-1">
          {current ? (
            <div className="border border-border bg-card p-4 sm:p-6">
              <header className="mb-6 border-b border-border pb-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {current.category && <span>{current.category}</span>}
                  {current.status && (
                    <span className="border border-border px-1">{current.status}</span>
                  )}
                  <span aria-hidden>·</span>
                  <time dateTime={current.published}>{current.published.slice(0, 10)}</time>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">{current.title}</h2>
                {current.description && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {current.description}
                  </p>
                )}
              </header>
              <div
                className="prose prose-zinc dark:prose-invert max-w-none prose-code:before:content-none prose-code:after:content-none"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          ) : list !== null && slug ? (
            <p className="text-muted-foreground">公告不存在</p>
          ) : null}
        </article>
      </div>
    </main>
  );
}
