'use client';

/**
 * /webnovel —— 交互小说列表。
 *
 * 数据由 loader 提供（SSR 直出），筛选条件编码在 URL（搜索是 GET 表单、
 * 翻页是真链接），组件不做自己的 fetch。**不要包 Suspense**（见 AGENTS.md）。
 * 列表用连体网格线：容器 border-t md:border-l，每项 border-b md:border-r。
 */
import { Form, Link } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/pagination';
import { buttonVariants } from '@/components/ui/button';
import { formatCompactCount } from '@/lib/format';
import { webnovelImageUrl } from '@/lib/webnovel/api/client';
import type { Novel } from '@/lib/webnovel/types';

export interface WebnovelInitialData {
  novels: Novel[];
  total: number;
  page: number;
  q: string;
  pageSize: number;
  error?: boolean;
}

function NovelCard({ novel }: { novel: Novel }) {
  return (
    <Link
      to={`/webnovel/${novel.slug}`}
      className="block border-b border-border md:border-r bg-background py-4 md:p-4 hover:bg-card transition-colors duration-75"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {novel.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
          <h2 className="text-base font-semibold line-clamp-1">{novel.title}</h2>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{novel.description || '暂无简介'}</p>
          <div className="flex items-center gap-2 flex-wrap mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 shrink-0">
              <Icon icon="mdi:account" className="size-3" />
              <span className="truncate max-w-[8rem]">{novel.authorName || '匿名'}</span>
            </span>
            {novel.aiGenerated && (
              <span className="inline-flex items-center gap-1 shrink-0" title="作者声明由 AI 撰写">
                <Icon icon="mdi:robot-outline" className="size-3" />
                AI
              </span>
            )}
            <span className="inline-flex items-center gap-1 shrink-0">
              <Icon icon="mdi:eye-outline" className="size-3" />
              {formatCompactCount(novel.viewCount)}
            </span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <Icon icon="mdi:heart-outline" className="size-3" />
              {formatCompactCount(novel.likeCount)}
            </span>
            <span className="shrink-0">{novel.updatedAt.slice(0, 10)}</span>
          </div>
        </div>
        {novel.cover && (
          <img
            src={webnovelImageUrl(novel.cover)}
            alt=""
            width={112}
            height={84}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="w-16 sm:w-28 aspect-[4/3] rounded-lg object-cover shrink-0"
          />
        )}
      </div>
    </Link>
  );
}

export default function WebnovelPage({ initial }: { initial: WebnovelInitialData }) {
  const pageCount = Math.max(1, Math.ceil(initial.total / initial.pageSize));

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-bold">交互小说</h1>
            <p className="text-sm text-muted-foreground mt-1">
              关卡式互动剧情 · 读者匿名游玩，进度保存在本地浏览器
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* 公开的格式规范：作者可以用自己的 AI 生成 JSON 再导入，不消耗创作点 */}
            <Link to="/webnovel/format" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              <Icon icon="mdi:code-json" className="size-4" />
              格式与提示词
            </Link>
            <Link to="/webnovel/editor" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <Icon icon="mdi:creation" className="size-4" />
              创作
            </Link>
          </div>
        </div>
      </header>

      <Form method="get" action="/webnovel" className="flex items-center gap-2 mb-4">
        <Input name="q" defaultValue={initial.q} placeholder="搜索标题或简介…" className="max-w-sm" />
        <button type="submit" className={buttonVariants({ variant: 'default', size: 'sm' })}>搜索</button>
      </Form>

      {initial.novels.length === 0 ? (
        <div className="border-y border-border py-12 text-center text-muted-foreground">
          {initial.error ? '服务暂不可用，请稍后再来。' : '还没有已发布的作品，成为第一个创作者吧。'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-border md:border-l">
          {initial.novels.map((n) => (
            <NovelCard key={n.id} novel={n} />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <div className="mt-4">
          <Pagination
            page={initial.page}
            pageCount={pageCount}
            hrefFor={(p) => `/webnovel?page=${p}${initial.q ? `&q=${encodeURIComponent(initial.q)}` : ''}`}
          />
        </div>
      )}
    </div>
  );
}
