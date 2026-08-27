'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import type { BangumiCollectionItem } from '@/lib/anime/types';
import {
  BGM_API,
  probeImageOrigin,
  withImageOrigin,
  type ImageOrigin,
} from '@/lib/anime/sources';

const USER_ID = 'acofork';

function coverUrl(img: BangumiCollectionItem['subject']['images']): string {
  return img.medium || img.common || img.large || img.small || '';
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function buildTimeline(items: BangumiCollectionItem[]): BangumiCollectionItem[] {
  return [...items].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

async function fetchAllWatched(signal?: AbortSignal): Promise<BangumiCollectionItem[]> {
  const all: BangumiCollectionItem[] = [];
  let offset = 0;
  for (;;) {
    const res = await fetch(
      `${BGM_API}/v0/users/${USER_ID}/collections?subject_type=2&type=2&limit=50&offset=${offset}`,
      // 不设 User-Agent：浏览器把它列为 forbidden header，设了也会被丢掉。
      // 官方 api.bgm.tv 不带 UA 会 403，这正是数据必须走代理的原因（见 sources.ts）
      { signal },
    );
    const page = await res.json() as { data: BangumiCollectionItem[]; total: number; limit: number };
    all.push(...page.data);
    offset += page.limit;
    if (offset >= page.total) break;
  }
  return all;
}

function AnimeCard({ item, imgOrigin }: { item: BangumiCollectionItem; imgOrigin: ImageOrigin | null }) {
  const { subject } = item;
  // imgOrigin 为 null（探测未完成）时不给 src —— 给空字符串会让浏览器
  // 对当前页面地址发一次无谓请求
  const src = imgOrigin ? withImageOrigin(coverUrl(subject.images), imgOrigin) : undefined;
  const score = subject.score ?? 0;

  return (
    <a
      href={`https://bangumi.tv/subject/${subject.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block border-b border-border md:border-r bg-background py-4 md:p-4 hover:bg-card transition-colors duration-75"
    >
      <div className="flex gap-3 sm:gap-4">
        <div className="shrink-0 w-16 sm:w-28">
          <img
            src={src}
            alt={subject.name_cn || subject.name || ''}
            className="w-full aspect-[3/4] rounded-lg object-cover bg-muted"
            loading="lazy"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-semibold leading-snug group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
            {subject.name_cn || subject.name}
          </h3>
          {subject.name_cn && subject.name && subject.name_cn !== subject.name && (
            <p className="text-xs text-muted-foreground mt-0.5">{subject.name}</p>
          )}

          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            {score > 0 && <span className="inline-flex items-center gap-1"><Icon icon="mdi:star-outline" className="size-3.5" />{score}</span>}
            {item.rate > 0 && <span className="text-rose-500">我的评分: {item.rate}</span>}
            {subject.eps > 0 && <span>{subject.eps} 集</span>}
            {subject.date && <span>{subject.date}</span>}
          </div>

          {subject.short_summary && (
            <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-2 leading-relaxed">
              {truncate(subject.short_summary.replace(/\n/g, ' '), 200)}
            </p>
          )}

          {item.comment && (
            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 italic mt-1.5 flex items-start gap-1">
              <Icon icon="mdi:format-quote-open" className="size-3 shrink-0 mt-0.5" />
              {item.comment}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}

export default function AnimePage({ initial }: { initial?: BangumiCollectionItem[] } = {}) {
  const [items, setItems] = useState<BangumiCollectionItem[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial?.length);
  const [error, setError] = useState('');
  // 图片源在探测出结果之前是 null，此时卡片只渲染占位底色、**不设 src**。
  //
  // 曾经的写法是「先按代理源渲染，探测完再切换」，看似能省掉等待，实测代价是
  // 每张封面被两个源各加载一次（60 张图 → 120 个请求，整整多一倍流量）：
  // imgOrigin 一变，所有 <img> 的 src 跟着变，浏览器把它当成新图重新拉。
  // 探测只需几百毫秒且与数据请求串在一起，远比多下一份封面划算。
  const [imgOrigin, setImgOrigin] = useState<ImageOrigin | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const doFetch = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');
    setItems([]);

    fetchAllWatched(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setItems(data);
          setLoading(false);
          // 用第一张真实封面竞速两个图片源，谁先 onload 用谁。
          // 探测失败会回落到代理源，因此这里不需要 catch。
          const sample = data.length ? coverUrl(data[0].subject.images) : '';
          if (sample) {
            void probeImageOrigin(sample).then((origin) => {
              if (!controller.signal.aborted) setImgOrigin(origin);
            });
          }
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('获取追番数据失败，请稍后重试');
        setLoading(false);
      });
  };

  // SSR 首屏已有数据时跳过第一次请求
  const skipFirstFetch = useRef(Boolean(initial?.length));
  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    doFetch();
    return () => abortRef.current?.abort();
  }, []);

  const sorted = useMemo(() => buildTimeline(items), [items]);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
            追番记录
          </h1>
        </div>

        <p className="text-sm text-muted-foreground mt-1">
          已观看 {items.length} 部动画
        </p>
      </div>

      {error && (
        <div className="-mx-4 border-y border-red-300 bg-red-50 dark:bg-red-950/20 px-4 py-4 sm:mx-0 sm:border mb-6 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 border-t border-border md:border-l">
          {Array.from({ length: 9 }).map((_, c) => (
            <div key={c} className="border-b border-border md:border-r py-4 md:p-4">
              <div className="flex gap-3 sm:gap-4">
                <Skeleton className="w-16 sm:w-28 aspect-[3/4] shrink-0" />
                <div className="flex-1 space-y-2.5 py-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 border-t border-border md:border-l">
          {sorted.map((item) => (
            <AnimeCard key={item.subject_id} item={item} imgOrigin={imgOrigin} />
          ))}
        </div>
      )}
    </main>
  );
}
