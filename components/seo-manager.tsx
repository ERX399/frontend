import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { resolveRouteMeta } from '@/lib/seo/route-meta';
import { applySeo } from '@/lib/seo/apply-seo';

/**
 * 路由级 SEO 中枢：每次导航按路由表重写 title/description/canonical/OG/robots。
 * 动态详情页（博客文章、论坛帖子）先拿到兜底 meta，数据加载完成后由页面自行
 * 调用 applySeo 覆写为真实内容。
 */
export function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = resolveRouteMeta(pathname);
    applySeo({
      title: meta.title,
      description: meta.description,
      noindex: meta.noindex,
      ogType: meta.ogType,
      path: pathname,
    });
  }, [pathname]);

  return null;
}
