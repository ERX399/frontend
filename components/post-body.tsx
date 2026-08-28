'use client';

import { useEffect, useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { renderMarkdown, addHeadingIds } from '@/lib/render-markdown';
import { MermaidContent } from '@/components/mermaid-renderer';
import { Skeleton } from '@/components/ui/skeleton';
import { readEmbeddedPostData } from '@/lib/embedded-post-data';

export function PostBody({ slug, domain }: { slug: string; domain?: string }) {
  // 预渲染页直开时同步读内嵌 markdown（base64，已剥离 frontmatter，见
  // scripts/emergency-prerender-posts.mts）→ 跳过 fetch、直接渲染，正文不闪。
  // 客户端换篇时组件带 key={slug} 重挂载，此时 DOM 里的内嵌 script 已被
  // React 替换掉 → 返回 null → 走下方 fetch。
  const [markdown, setMarkdown] = useState<string | null>(() => readEmbeddedPostData('post-md'));
  const [loading, setLoading] = useState(() => !markdown);
  const [error, setError] = useState('');

  const baseDomain = domain || 'https://raw-posts.520pro.top';

  // 线上 dist/posts/*.md 可能是未重写的旧产物，正文里图片仍是相对 /img/ 路径，
  // 会解析到主站 520pro.top/img/ 导致 404。统一在渲染前把相对 /img/ 重写到数据源
  // 域名（img/ 所在仓库），已绝对化的 URL 不受影响。放这里（而非 fetch 分支）是为了
  // 内嵌 base64 直开预渲染页的那条路径也一起覆盖。
  // 两种写法都覆盖：markdown 图片语法 `![..](/img/x)`，以及 html:true 透传的
  // 原始 HTML `<img src="/img/x">`（含单/双引号）。只匹配相对前缀，不会碰
  // `https://域名/img/` 这种已绝对化的 URL。
  const rewriteImgPaths = (md: string) =>
    md
      .replace(/\]\(\/img\//g, `](${baseDomain}/img/`)
      .replace(/(src=["'])\/img\//g, `$1${baseDomain}/img/`);

  useEffect(() => {
    if (markdown) return; // 内嵌数据已就绪，无需拉取
    let cancelled = false;
    setLoading(true);
    setError('');

    fetch(`${baseDomain}/posts/${slug}.md`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) {
          // Strip frontmatter
          const body = text.replace(/^---[\s\S]*?---\n?/, '');
          setMarkdown(body);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [slug, baseDomain]);

  const html = useMemo(() => {
    if (!markdown) return '';
    // eagerFirstImage 要和 app/lib/blog.server.ts 的正文渲染保持一致
    const withIds = addHeadingIds(renderMarkdown(rewriteImgPaths(markdown), { eagerFirstImage: true }));
    // target 要显式放行：DOMPurify 默认白名单没有它，renderMarkdown 给站外
    // 链接加的 target="_blank" 会被剥掉（rel 不受影响，会留下来）
    return DOMPurify.sanitize(withIds, { ADD_ATTR: ['id', 'target'] });
  }, [markdown]);

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="font-mono text-xs text-muted-foreground">
          rendering markdown<span className="ml-1 inline-block h-[1em] w-[0.55em] translate-y-px bg-muted-foreground [animation:shell-blink_1s_step-end_infinite]" />
        </p>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/6" />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-sm">加载失败: {error}</p>;
  }

  return (
    <MermaidContent
      html={html}
      className="prose prose-zinc dark:prose-invert max-w-none prose-pre:bg-[#1e1e2e] prose-code:before:content-none prose-code:after:content-none prose-img:rounded-xl prose-headings:scroll-mt-20"
    />
  );
}
