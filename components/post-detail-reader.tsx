import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { PostBody } from '@/components/post-body';
import { Giscus } from '@/components/giscus';
import { TableOfContents } from '@/components/table-of-contents';
import { ImageLightbox } from '@/components/image-lightbox';
import { Skeleton } from '@/components/ui/skeleton';
import { applySeo } from '@/lib/seo/apply-seo';
import { SITE_URL } from '@/lib/seo/route-meta';
import { readEmbeddedPostData } from '@/lib/embedded-post-data';

const POSTS_DOMAIN = import.meta.env.VITE_POSTS_DOMAIN || 'https://raw-posts.2x.nz';
/** 文章 markdown 源文件所在的开源仓库 */
const POSTS_REPO = 'https://github.com/afoim/af_blog-data';

interface PostMeta {
  slug: string;
  title: string;
  description: string;
  published: string;
  image: string | null;
  pinned: boolean;
  draft: boolean;
  hide: boolean;
  tags: string[];
  category?: string;
  lang?: string;
  ai_level?: number;
}

/** 预渲染页内嵌的 meta（base64 JSON，见 scripts/emergency-prerender-posts.mts） */
function readEmbeddedMeta(slug: string): PostMeta | null {
  const raw = readEmbeddedPostData('post-meta');
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as PostMeta;
    return data.slug === slug ? data : null;
  } catch {
    return null;
  }
}

export function PostDetailReader({ slug }: { slug: string }) {
  // 预渲染直开时同步读到内嵌 meta → 首帧就渲染正文（不显示骨架）；
  // 客户端换篇（slug 变）时这里拿不到新 slug 的内嵌数据，走 useEffect fetch。
  const [meta, setMeta] = useState<PostMeta | null>(() => readEmbeddedMeta(slug));
  const [loading, setLoading] = useState(() => meta === null);
  const [neighbors, setNeighbors] = useState<{ prev: PostMeta | null; next: PostMeta | null }>({
    prev: null,
    next: null,
  });

  // 预渲染壳清理：React 已把正文渲染进自己的树，把静态壳与内嵌数据从 DOM 摘掉。
  // 壳的 wrapper 结构与 Layout 的 flex-1 pt-14 一致，摘掉后 React 的正文占同一位置，
  // 不产生布局跳动。仅首次挂载执行（客户端换篇时壳早已不在 DOM）。
  useEffect(() => {
    document.getElementById('__rr_prerender__')?.remove();
    document.getElementById('post-meta')?.remove();
    document.getElementById('post-md')?.remove();
  }, []);

  useEffect(() => {
    // 内嵌 meta 属于当前 slug（预渲染首屏）时保持可见，只静默拉 posts.json
    // 补上一篇/下一篇 + SEO；否则显示骨架
    setLoading(meta?.slug !== slug);
    fetch(`${POSTS_DOMAIN}/posts.json`)
      .then((r) => r.json())
      .then((json) => {
        // 兼容旧「数组」与新「索引对象 { posts }」两种格式
        const data: PostMeta[] = Array.isArray(json) ? json : (json?.posts ?? []);
        const found = data.find((p) => p.slug === slug && !p.draft && !p.hide);
        setMeta(found ?? null);
        setLoading(false);
        // 上一篇/下一篇：按发布时间倒序的可见文章列表中取相邻两篇
        const visible = data
          .filter((p) => !p.draft && !p.hide)
          .sort((a, b) => (b.published || '').localeCompare(a.published || ''));
        const idx = found ? visible.findIndex((p) => p.slug === found.slug) : -1;
        setNeighbors({
          prev: idx > 0 ? visible[idx - 1] : null,
          next: idx >= 0 && idx < visible.length - 1 ? visible[idx + 1] : null,
        });
        if (found) {
          applySeo({
            title: found.title,
            description: found.description || `${found.title} —— 来自夏之的博客文章。`,
            path: `/posts/${found.slug}`,
            ogType: 'article',
            ogImage: found.image ?? undefined,
            jsonLd: {
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: found.title,
              description: found.description || undefined,
              datePublished: found.published || undefined,
              // 富媒体文章卡要求有图：无封面时退回站点默认分享图
              image: found.image
                ? new URL(found.image, SITE_URL).toString()
                : `${SITE_URL}/files/img/official.png`,
              keywords: found.tags.length ? found.tags.join(',') : undefined,
              inLanguage: 'zh-CN',
              author: { '@type': 'Person', name: 'AcoFork', url: SITE_URL },
              mainEntityOfPage: `${SITE_URL}/posts/${found.slug}`,
            },
          });
        } else {
          applySeo({ title: '文章未找到', description: '你访问的文章不存在或已下线。', noindex: true });
        }
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex gap-8">
          <div className="flex-1 min-w-0 max-w-3xl mx-auto">
            <p className="mb-6 font-mono text-xs text-muted-foreground">
              loading post<span className="ml-1 inline-block h-[1em] w-[0.55em] translate-y-px bg-muted-foreground [animation:shell-blink_1s_step-end_infinite]" />
            </p>
            <div className="space-y-4">
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="aspect-video w-full" />
              <div className="space-y-3 pt-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
          <aside className="hidden xl:block w-[320px] flex-shrink-0">
            <div className="sticky top-20 border border-border bg-card p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </aside>
        </div>
      </main>
    );
  }

  if (!meta) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-8">文章未找到</p>
        <Link to="/posts" className="text-primary hover:underline">返回博客列表</Link>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex gap-8 relative">
        <article className="flex-1 min-w-0 max-w-3xl mx-auto">
          <Link
            to="/posts"
            className="flex items-center gap-1 border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent mb-4 transition-colors"
          >
            <Icon icon="mdi:arrow-left" className="size-4" />
            返回博客列表
          </Link>

          <div className="border border-border bg-card p-4 sm:p-6 mb-4">
          <header className="mb-8 pb-6 border-b border-border">
            {meta.pinned && (
              <div className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 mb-3">
                <Icon icon="mdi:pin" className="size-3" />
                置顶
              </div>
            )}
            <h1 className="text-3xl font-bold tracking-tight">{meta.title}</h1>
            {meta.description && (
              <p className="mt-3 text-base text-muted-foreground leading-relaxed">
                {meta.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground flex-wrap leading-none">
              <span className="inline-flex items-center gap-1">
                <Icon icon="mdi:calendar" className="size-3" />
                <time dateTime={meta.published}>
                  {meta.published.slice(0, 10)}
                </time>
              </span>
              <span aria-hidden>·</span>
              {meta.category && (
                <>
                  <span aria-hidden>·</span>
                  <span>{meta.category}</span>
                </>
              )}
              {meta.tags.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <div className="flex gap-1.5">
                    {meta.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-secondary text-secondary-foreground px-2.5 py-0.5 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {meta.ai_level && (
                <>
                  <span aria-hidden>·</span>
                  <span className="text-xs text-muted-foreground/80">
                    AI 辅助 · {meta.ai_level === 1 ? '轻度' : '深度'}
                  </span>
                </>
              )}
            </div>
            {meta.image && (
              <img
                src={meta.image}
                alt={meta.title}
                data-lightbox
                className="mt-6 w-full cursor-zoom-in object-cover aspect-video"
              />
            )}
          </header>

            <PostBody key={slug} slug={slug} />

            {/* 文章源文件开源在 eleventy-blog-pagescms 仓库，可直接提 PR 勘误 */}
            <div className="mt-8 pt-6 border-t border-border">
              <a
                href={`${POSTS_REPO}/edit/main/posts/${slug}.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon icon="mdi:github" className="size-4" />
                在 GitHub 编辑此文章
              </a>
            </div>

            {(neighbors.prev || neighbors.next) && (
              <nav className="mt-8 pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  {neighbors.prev && (
                    <Link to={`/posts/${neighbors.prev.slug}`} className="group flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">← 上一篇</span>
                      <span className="font-medium truncate group-hover:underline">{neighbors.prev.title}</span>
                    </Link>
                  )}
                </div>
                <div className="sm:text-right">
                  {neighbors.next && (
                    <Link to={`/posts/${neighbors.next.slug}`} className="group flex flex-col gap-1 sm:items-end">
                      <span className="text-xs text-muted-foreground">下一篇 →</span>
                      <span className="font-medium truncate group-hover:underline max-w-full">{neighbors.next.title}</span>
                    </Link>
                  )}
                </div>
              </nav>
            )}
          </div>
          <div id="comments" className="border border-border bg-card p-4 sm:p-6 scroll-mt-20">
            <Giscus />
          </div>
        </article>

        <aside className="hidden xl:block w-[320px] flex-shrink-0">
          <div className="sticky top-20 space-y-8">
            <div className="border border-border bg-card p-4">
              <TableOfContents />
            </div>
          </div>
        </aside>
      </div>
      <ImageLightbox />
    </main>
  );
}
