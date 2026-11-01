'use client';

import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { LoadErrorPanel } from '@/components/load-error';
import { isLikelyStaleModuleError, reloadOnce } from '@/lib/auto-refresh';

/**
 * 路由级错误边界：懒加载 chunk 404、渲染时抛异常都会落到这里。
 *
 * 站点更新后旧 chunk 失效是最常见的一类（含边缘把 404 兜底成 HTML、模块形状
 * 不对的那种变体），刷新一次必然恢复，所以自动重载；
 * 闸门拦住（刚刷过）或者确实不是加载问题（真的渲染崩了）时，才把错误摆出来。
 */
export function RouteError() {
  const error = useRouteError();
  const stale = isLikelyStaleModuleError(error);
  const status = isRouteErrorResponse(error) ? error.status : null;
  const message = isRouteErrorResponse(error)
    ? error.statusText || `HTTP ${error.status}`
    : error instanceof Error
      ? error.message
      : String(error ?? '');

  useEffect(() => {
    if (stale) reloadOnce('route-chunk');
  }, [stale]);

  return (
    <main className="container mx-auto max-w-2xl px-4 py-16">
      <LoadErrorPanel
        title={stale ? '页面资源已更新' : '页面出错了'}
        detail={
          stale
            ? '站点刚更新过，旧缓存已经失效，正在自动刷新到最新版本'
            : status
              ? `服务返回 ${status}，可能是页面刚被移动或删除`
              : message || '渲染过程出了点问题，刷新一次通常就好了'
        }
        backTo="/"
        backLabel="返回首页"
      />
    </main>
  );
}
