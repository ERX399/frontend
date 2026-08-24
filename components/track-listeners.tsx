'use client';

import { useEffect } from 'react';
import { track } from '@/lib/track';

/**
 * 全站点击埋点的事件委托。
 *
 * 走 document 级委托而不是给每个 <a> 挂 onClick：外链散在友链、赞助、页脚、
 * 首页社交栏、博客正文（markdown 渲染出来的，根本没有组件可挂）里，逐个接线
 * 既会漏、又会在每次新增链接时忘记补。委托只有一处，正文里的链接也一样覆盖。
 *
 * 注意别在这里做重活：这是挂在 document 上的高频监听，只做几次字符串判断。
 */
export function TrackListeners() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // 只认真正的「打开链接」：辅助键点击是用户自己开新标签，仍然算一次跳转，
      // 所以不排除；但右键/中键不会触发 click，天然不用管
      const a = (e.target as HTMLElement | null)?.closest?.('a');
      if (!(a instanceof HTMLAnchorElement)) return;

      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      let url: URL;
      try {
        url = new URL(a.href, location.href);
      } catch {
        return;
      }

      // 订阅源：同源，但语义上是「订阅」而不是「站内导航」
      if (/\/rss\.xml$/.test(url.pathname)) {
        track('订阅 RSS', { 来源: url.pathname });
        return;
      }

      if (url.protocol === 'mailto:' || url.protocol === 'tel:') {
        track('联系方式', { 方式: url.protocol.replace(':', '') });
        return;
      }

      if (url.host && url.host !== location.host) {
        track('站外跳转', { 目标: url.host, 所在页: location.pathname });
      }
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
