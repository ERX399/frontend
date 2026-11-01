'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { releaseAutoReload, reloadOnce } from '@/lib/auto-refresh';

/**
 * 数据没回来时的自救钩子：确认是抓取失败（而不是内容本来就不存在）后自动整页重载一次。
 *
 * 刷新闸门在 reloadOnce 里，刚刷过还在冷却期内会返回 false，此时必须停下，
 * 由界面上的手动按钮接管 —— 否则就是一个刷新死循环。
 *
 * @returns 是否已被闸门拦下、需要露出可点的手动入口
 */
export function useAutoReload(active: boolean, cause: string): boolean {
  const [blocked, setBlocked] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (!active || fired.current) return;
    fired.current = true;
    setBlocked(!reloadOnce(cause));
  }, [active, cause]);

  return blocked;
}

export function RefreshButton({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        releaseAutoReload();
        window.location.reload();
      }}
      className={`inline-flex h-9 items-center justify-center gap-1.5 border border-foreground bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-transparent hover:text-foreground ${className}`}
    >
      <Icon icon="lucide:rotate-cw" className="size-4" />
      刷新页面
    </button>
  );
}

export function LoadErrorPanel({
  title = '内容没能加载',
  detail,
  backTo,
  backLabel,
  compact = false,
}: {
  title?: string;
  detail?: string;
  backTo?: string;
  backLabel?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 border border-border bg-card text-center ${
        compact ? 'px-4 py-8' : 'px-4 py-12'
      }`}
    >
      <Icon icon="lucide:triangle-alert" className="size-5 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">
          {detail ?? '可能是网络抖动或站点刚刚更新，刷新一次通常就好了'}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <RefreshButton />
        {backTo && backLabel && (
          <Link
            to={backTo}
            className="inline-flex h-9 items-center border border-border px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
          >
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
