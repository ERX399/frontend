'use client';

/**
 * /webnovel/:slug —— 作品详情（SSR）。
 *
 * 封面/简介/作者/统计由 loader 直出；「开始游玩」按钮指向阶段 1 的阅读器引擎，
 * 当前置灰并说明。读者匿名，无需登录即可浏览。
 */
import { Link } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { Button, buttonVariants } from '@/components/ui/button';
import { useEffect } from 'react';
import { formatCompactCount } from '@/lib/format';
import { webnovelImageUrl, recordView } from '@/lib/webnovel/api/client';
import { LikeButton } from '@/components/webnovel/like-button';
import type { Novel } from '@/lib/webnovel/types';

export default function WebnovelDetailPage({ initial }: { initial: Novel }) {
  const pageCount = initial.source?.pages?.length ?? 0;

  // 记一次浏览（后端按访客指纹 6 小时去重）。此前浏览量从没被写过，恒为 0。
  useEffect(() => {
    void recordView(initial.slug).catch(() => {});
  }, [initial.slug]);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <Link
        to="/webnovel"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <Icon icon="mdi:arrow-left" className="size-4" />
        返回列表
      </Link>

      <div className="flex items-start gap-4 sm:gap-6 border-b border-border pb-5">
        {initial.cover && (
          <img
            src={webnovelImageUrl(initial.cover)}
            alt=""
            width={160}
            height={120}
            className="w-28 sm:w-40 aspect-[4/3] rounded-lg object-cover shrink-0"
          />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {initial.tags.slice(0, 5).map((t) => (
              <span key={t} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                {t}
              </span>
            ))}
            {initial.status === 'draft' && (
              <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                草稿
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold break-words">{initial.title}</h1>
          <div className="flex items-center gap-2 flex-wrap mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 shrink-0">
              <Icon icon="mdi:account" className="size-3" />
              {initial.authorName || '匿名'}
            </span>
            {/* AI 撰写声明：读者有权知道手里这部作品是谁写的 */}
            {initial.aiGenerated && (
              <span
                className="inline-flex items-center gap-1 shrink-0 bg-secondary text-secondary-foreground px-1.5"
                title="作者声明本作品由 AI 撰写"
              >
                <Icon icon="mdi:robot-outline" className="size-3" />
                AI 撰写
              </span>
            )}
            <span className="inline-flex items-center gap-1 shrink-0">
              <Icon icon="mdi:eye-outline" className="size-3" />
              {formatCompactCount(initial.viewCount)}
            </span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <Icon icon="mdi:heart-outline" className="size-3" />
              {formatCompactCount(initial.likeCount)}
            </span>
            {pageCount > 0 && <span className="shrink-0">{pageCount} 页</span>}
            <span className="shrink-0">{initial.updatedAt.slice(0, 10)}</span>
          </div>
        </div>
      </div>

      {initial.description && (
        <p className="py-5 border-b border-border whitespace-pre-wrap break-words">{initial.description}</p>
      )}

      <div className="py-5">
        {pageCount > 0 ? (
          <Link to={`/webnovel/play/${initial.slug}`} className={buttonVariants({ variant: 'default', size: 'lg' }) + ' w-full sm:w-auto'}>
            <Icon icon="mdi:play" className="size-5" />
            开始游玩
          </Link>
        ) : (
          <Button size="lg" disabled className="w-full sm:w-auto">
            <Icon icon="mdi:play" className="size-5" />
            开始游玩
          </Button>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {pageCount > 0 ? '进度会自动保存在当前浏览器。' : '作者还没添加关卡，暂时无法游玩。'}
        </p>

        {/* 阅读前也能点赞（读完在结局处还有一次） */}
        <div className="mt-4">
          <LikeButton slug={initial.slug} initialLikes={initial.likeCount} />
        </div>
      </div>
    </div>
  );
}
