'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { toast } from 'sonner';
import { TableOfContents } from '@/components/table-of-contents';
import { readCommentCount } from '@/lib/page-comment-count';

/**
 * 全局右下角浮动操作堆（自下而上）：
 *   [↑ 回到顶部]   滚动超过 400px 后出现，全站可用
 *   [💬 直达评论]   博客/论坛详情页常驻，滚动到 #comments 锚点
 *   [🔗 复制链接]   博客/论坛详情页常驻，复制当前页 URL
 *   [📋 目录]       详情页移动端可用（lg:hidden），打开底部目录抽屉
 *   [➡ 隐藏]        手动收起整组，缩为贴边把手
 * 显隐策略：出现后常驻 5 秒 → 自动收起为屏幕右缘的小把手（◀）。
 * 滚动不会让它自动出现；用户点把手可展开，展开后同样常驻 5 秒再自动收起。
 */
const SHOW_MS = 5000;

export function FloatingActions() {
  const { pathname } = useLocation();
  const [showTop, setShowTop] = useState(false);
  const [progress, setProgress] = useState(0);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // 每个页面「首次出现即展示 5 秒」只触发一次，之后仅靠点击把手展开
  const pendingInitial = useRef(true);

  const isDetailPage =
    /^\/posts\/[^/]+\/?$/.test(pathname) ||
    (/^\/forum\/post\/[^/]+\/?$/.test(pathname) && !pathname.startsWith('/forum/post/new'));
  const hasContent = showTop || isDetailPage;

  // 展开并起 5 秒收起计时
  const showThenHide = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setCollapsed(false);
    idleTimer.current = setTimeout(() => setCollapsed(true), SHOW_MS);
  }, []);

  // 手动隐藏：立即收起，清掉计时
  const hide = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setCollapsed(true);
  }, []);

  // 详情页数据加载后广播评论数（page-comment-count），换页时清零。
  // effect 是子先父后，详情页（子）在本组件（布局层，父）注册监听器之前就把
  // 事件发完了 —— 所以除了监听，挂载时还要主动补读一次已知值。
  useEffect(() => {
    setCommentCount(readCommentCount(pathname));
    const onCount = (e: Event) => {
      const n = (e as CustomEvent<number>).detail;
      if (typeof n === 'number') setCommentCount(n);
    };
    window.addEventListener('page-comment-count', onCount);
    return () => window.removeEventListener('page-comment-count', onCount);
  }, [pathname]);

  // 换页：重置「首次展示」标记
  useEffect(() => {
    pendingInitial.current = true;
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [pathname]);

  // 内容首次可用（详情页挂载即有；列表页首次滚动越过 400px 后有）时，展示 5 秒再收起——每页仅一次
  useEffect(() => {
    if (hasContent && pendingInitial.current) {
      pendingInitial.current = false;
      showThenHide();
    }
  }, [hasContent, showThenHide]);

  // 滚动仅更新回到顶部/进度条，不改变显隐（不随滚动自动出现）
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setShowTop(window.scrollY > 400);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  const scrollToComments = () => {
    const el = document.getElementById('comments');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // 内容尚未加载完成时退化为滚到页底
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('链接已复制');
    } catch {
      toast.error('复制失败');
    }
  };

  const btnClass =
    'flex size-10 items-center justify-center border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground';

  return (
    <>
      {/* 阅读进度条：详情页专属，贴在顶部导航栏下沿 */}
      {isDetailPage && (
        <div className="fixed top-14 left-0 right-0 h-0.5 z-40 pointer-events-none" aria-hidden>
          <div
            className="h-full bg-foreground origin-left transition-transform duration-100 ease-linear"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      )}

      {/* 收起/展开：元素常驻 DOM，靠 CSS 类切换 transform/opacity。
          原本用 motion/react 的 AnimatePresence 做进出场 —— 但这是全站每页
          都会加载的装饰性交互，为它背一个 ~35KB 的动画库不划算。CSS 过渡
          同样有进场和退场，且退场不需要把元素留在 React 树里等动画结束。 */}
      <button
        type="button"
        onClick={showThenHide}
        className={`fixed bottom-24 right-0 z-40 flex h-12 w-6 items-center justify-center border border-r-0 border-border bg-card text-muted-foreground transition-all duration-300 ease-out hover:bg-accent hover:text-foreground ${
          hasContent && collapsed
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none invisible translate-x-12 opacity-0'
        }`}
        aria-label="展开操作按钮"
        aria-hidden={!(hasContent && collapsed)}
        tabIndex={hasContent && collapsed ? 0 : -1}
        title="展开操作按钮"
      >
        <Icon icon="mdi:chevron-left" className="size-5" />
      </button>

      <div
        className={`fixed bottom-6 right-6 z-40 flex flex-col gap-2 transition-all duration-300 ease-out ${
          hasContent && !collapsed
            ? 'translate-x-0 scale-100 opacity-100'
            : 'pointer-events-none invisible translate-x-7 scale-95 opacity-0'
        }`}
        aria-hidden={!(hasContent && !collapsed)}
      >
        {showTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={btnClass}
            aria-label="回到顶部"
            title="回到顶部"
          >
            <Icon icon="mdi:arrow-up" className="size-5" />
          </button>
        )}
        {isDetailPage && (
          <>
            <button
              type="button"
              onClick={scrollToComments}
              className={`${btnClass} relative`}
              aria-label={commentCount ? `直达评论区（${commentCount} 条评论）` : '直达评论区'}
              title="直达评论区"
            >
              <Icon icon="mdi:comment-outline" className="size-5" />
              {commentCount !== null && commentCount > 0 && (
                /* aria-hidden：角标数字是 aria-label 的重复信息，留着会让无障碍名
                   与可见文字对不上（WCAG 2.5.3），计数已并入上面的 aria-label */
                <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 border border-background bg-foreground px-1 py-0.5 font-mono text-[10px] leading-none text-background">
                  {commentCount > 99 ? '99+' : commentCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={copyLink}
              className={btnClass}
              aria-label="复制本页链接"
              title="复制本页链接"
            >
              <Icon icon="mdi:link-variant" className="size-5" />
            </button>
            {/* 目录按钮：仅在详情页且屏幕小于 lg 时显示（>=lg 有侧栏目录） */}
            <button
              type="button"
              onClick={() => setTocOpen(true)}
              className={`${btnClass} lg:hidden`}
              aria-label="打开目录"
              title="打开目录"
            >
              <Icon icon="mdi:format-list-bulleted" className="size-5" />
            </button>
          </>
        )}
        {/* 手动隐藏：收起为贴边把手 */}
        <button
          type="button"
          onClick={hide}
          className={btnClass}
          aria-label="隐藏操作按钮"
          title="隐藏操作按钮"
        >
          <Icon icon="mdi:chevron-right" className="size-5" />
        </button>
      </div>

      {/* TOC 抽屉：同样改为常驻 + CSS 过渡 */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ease-out ${
          tocOpen ? 'opacity-100' : 'pointer-events-none invisible opacity-0'
        }`}
        aria-hidden
        onClick={() => setTocOpen(false)}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 flex max-h-[70vh] w-full flex-col overflow-hidden border-t border-foreground/80 bg-background transition-transform duration-200 ease-out ${
          tocOpen ? 'translate-y-0' : 'pointer-events-none invisible translate-y-full'
        }`}
        role="dialog"
        aria-label="目录"
        aria-hidden={!tocOpen}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex-1">
            <h3 className="font-semibold">目录</h3>
          </div>
          <button
            onClick={() => setTocOpen(false)}
            className="ml-4 inline-flex size-7 items-center justify-center font-mono text-muted-foreground transition-colors duration-75 hover:bg-foreground hover:text-background"
            aria-label="关闭"
            tabIndex={tocOpen ? 0 : -1}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {/* 点目录条目即关抽屉：否则 70vh 抽屉 + 遮罩盖住目标，用户以为没跳 */}
          <TableOfContents onNavigate={() => setTocOpen(false)} />
        </div>
      </div>
    </>
  );
}
