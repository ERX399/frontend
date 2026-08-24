'use client';

/**
 * 点赞按钮（详情页与阅读器结局处共用）。
 *
 * 读者匿名，点赞态由后端按「IP+UA 指纹」判定 —— 换设备/清缓存会重新算，
 * 这是匿名口径下的取舍（不引入账号就没法做到绝对准确）。
 */
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { fetchSocial, toggleLike } from '@/lib/webnovel/api/client';

export function LikeButton({
  slug,
  initialLikes = 0,
  size = 'md',
}: {
  slug: string;
  initialLikes?: number;
  size?: 'sm' | 'md';
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSocial(slug)
      .then((s) => {
        if (cancelled) return;
        setLikes(s.likes);
        setLiked(s.liked);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const onClick = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    // 乐观更新：点下去立刻有反馈，失败再回滚
    const prev = { likes, liked };
    setLiked(!liked);
    setLikes(likes + (liked ? -1 : 1));
    try {
      const r = await toggleLike(slug);
      setLiked(r.liked);
      setLikes(r.likes);
    } catch {
      setLiked(prev.liked);
      setLikes(prev.likes);
    } finally {
      setBusy(false);
    }
  }, [busy, liked, likes, slug]);

  const big = size === 'md';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? '取消点赞' : '点赞'}
      className={`inline-flex items-center gap-1.5 border transition-colors ${
        big ? 'h-9 px-3 text-sm' : 'h-7 px-2 text-xs'
      } ${
        liked
          ? 'border-foreground bg-foreground text-background'
          : 'border-border hover:border-foreground'
      } disabled:opacity-60`}
    >
      <Icon icon={liked ? 'mdi:heart' : 'mdi:heart-outline'} className={big ? 'size-4' : 'size-3.5'} />
      <span className="font-mono">{likes}</span>
      <span>{liked ? '已赞' : '点赞'}</span>
    </button>
  );
}
