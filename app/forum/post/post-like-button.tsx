import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { toast } from 'sonner';
import { likePost, getPostLikeStatus } from '@/lib/forum/api/client';
import { formatCompactCount } from '@/lib/format';

/**
 * 帖子点赞按钮。
 *
 * 计数照旧由 SSR 直出（无 JS 访客要看得到真实点赞数），但「当前用户点没点过赞」
 * 依赖登录态、服务端拿不到 —— loader 返回的 `liked` 恒为 false。所以挂载后再单独
 * 拉一次 `/api/posts/:id/like-status` 补上，只在本地有 token 时发这一个请求。
 *
 * 计数必须以 `initialCount` 作为 state 初值：后端的 like 接口只回 `{ liked }`、
 * 不回新计数，前端只能本地 ±1 推算。此前 state 初值写死 0，靠渲染时
 * `postLikeCount || post.likeCount` 兜底显示 —— 一点赞就变成 0+1=1，把真实点赞数
 * 抹成 1；取消赞回到 0 又落回兜底值，于是「点赞变 1、取消赞正常」。
 */
export function PostLikeButton({
  postId,
  initialCount,
  initialLiked,
}: {
  postId: string;
  initialCount: number;
  initialLiked?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked ?? false);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  // 换帖子时（SPA 内导航会复用同一个组件实例）重置为新帖子的服务端数据，
  // 再按登录态补拉真实的 liked。依赖只列 postId：initialCount 变化不该覆盖
  // 用户点赞后的本地计数。
  useEffect(() => {
    let cancelled = false;
    setLiked(initialLiked ?? false);
    setCount(initialCount);
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('forum-auth-token')) return;
    getPostLikeStatus(postId)
      .then((r) => { if (!cancelled) setLiked(r.liked); })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleLike = async () => {
    if (pending) return;
    setPending(true);
    try {
      const r = await likePost(postId);
      setLiked(r.liked);
      // 后端不返回新计数，本地推算
      setCount((prev) => (r.liked ? prev + 1 : Math.max(0, prev - 1)));
    } catch (e: unknown) {
      toast.error('点赞失败', { description: e instanceof Error ? e.message : '请稍后再试' });
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLike}
      aria-pressed={liked}
      className={`inline-flex items-center gap-1 shrink-0 transition-colors ${liked ? 'text-red-500' : 'hover:text-red-400'}`}
    >
      <Icon icon={liked ? 'mdi:heart' : 'mdi:heart-outline'} className="size-4" />
      {formatCompactCount(count)}
    </button>
  );
}
