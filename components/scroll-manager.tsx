import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * 路由切换时的滚动处理：SPA 换页不会像整页刷新那样重置滚动位置，
 * 从首页滚到中段再点进 /links，就会停在上一次的位置而不是页首。
 *
 * - 带 hash：滚到目标锚点（锚点自身的 scroll-mt 负责让开顶栏）
 * - 不带 hash：回到页首
 *
 * 目标区块的内容是异步拉取的，占位骨架的高度和真实内容差很多：只滚一次会因为
 * 随后内容收缩而停在错误位置（实测会冲到页面最底部）。所以找到目标后持续校正，
 * 直到它的位置连续几帧不再变化为止；期间用户一旦自己滚动就让位，不再抢。
 * 一直找不到目标就退回页首，避免停在无意义的旧位置。
 */
export function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const id = hash ? decodeURIComponent(hash.slice(1)) : '';
    if (!id) {
      window.scrollTo({ top: 0, left: 0 });
      return;
    }

    let handle = 0;
    let frame = 0;
    let lastTop = Number.NaN;
    let stable = 0;
    let cancelled = false;

    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(handle);
    };
    // 用户自己滑动/滚轮/按键时立刻让位，别把页面拽回去
    const events = ['wheel', 'touchstart', 'keydown'] as const;
    events.forEach((name) => window.addEventListener(name, stop, { passive: true }));

    const settle = () => {
      if (cancelled) return;
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ block: 'start' });
        const top = Math.round(target.getBoundingClientRect().top);
        stable = top === lastTop ? stable + 1 : 0;
        lastTop = top;
        // 位置连稳 6 帧，或校正满 90 帧就收手
        if (stable >= 6 || ++frame >= 90) return;
        handle = requestAnimationFrame(settle);
        return;
      }
      if (++frame >= 30) {
        window.scrollTo({ top: 0, left: 0 });
        return;
      }
      handle = requestAnimationFrame(settle);
    };
    handle = requestAnimationFrame(settle);

    return () => {
      events.forEach((name) => window.removeEventListener(name, stop));
      cancelAnimationFrame(handle);
    };
  }, [pathname, hash]);

  return null;
}
