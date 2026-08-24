/**
 * 详情页 → 浮动操作堆的评论数传递。
 *
 * 原先只有一个 `page-comment-count` CustomEvent，且只在帖子详情页的
 * `loadPost()` 里广播 —— 有 loader 数据时 `loadPost` 整个被跳过，SSR 页面上
 * 角标永远不出现。改成在 effect 里发之后还有第二个坑：React 的 effect 是
 * **子先父后**，`FloatingActions` 挂在布局层（父），它注册监听器时详情页
 * （子）早就把事件发完了，首屏依然收不到。
 *
 * 所以事件之外再存一份「最近一次的值」，让 FloatingActions 在挂载/换页时
 * 主动补读；事件只负责后续更新（发表/删除评论）。
 */
let latest: { path: string; count: number } | null = null;

export function publishCommentCount(path: string, count: number): void {
  latest = { path, count };
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('page-comment-count', { detail: count }));
}

/** 当前路径上已知的评论数；没有（或属于上一个页面）时返回 null */
export function readCommentCount(path: string): number | null {
  return latest && latest.path === path ? latest.count : null;
}
