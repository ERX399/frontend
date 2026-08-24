'use client';

import { useEffect, useRef } from 'react';
import { useNavigation } from 'react-router';

/**
 * 触屏点击反馈 —— SSR+SPA 的补丁。
 *
 * 全站是 SSR + SPA 客户端导航，点一个按钮/链接后要等 loader 拉数据、新页面
 * 渲染，触屏上又没有 hover，这段时间里界面毫无变化，用户会以为没点到而反复点。
 *
 * 方案：真实触屏点击（click 前有 pointerdown 且 pointerType=touch）后，给被点
 * 元素挂 .tap-pending（蓝字蓝框，样式在 globals.css 的
 * `@media (hover:none) and (pointer:coarse)` 块）。随后：
 *   - React Router 导航进行中（navigation.state !== 'idle'）：取消兜底计时器，
 *     让反馈一直挂着 —— 旧页面在加载期间仍可见，被点元素也在，蓝框陪到新页面
 *     渲染出来、元素卸载为止；
 *   - 非导航动作（弹窗、接口请求）：兜底计时器 1.5s 后清除，只当「点到了」确认；
 *   - 导航回到 idle：500ms 后清除残留（快导航时元素多半已卸载，清的是空引用）。
 *
 * 纯 CSS 的 :active 已覆盖「按住瞬间」，这里只管「松手后的持续态」。组件渲染
 * null，只在 useEffect 里碰 DOM，SSR 安全、不污染无 JS 路径。
 */
export function TapFeedback() {
  const navigation = useNavigation();
  const pendingRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 计时器闭包里要读「当前」导航状态，用 ref 镜像（useEffect 依赖项换掉会反复重挂监听）
  const navStateRef = useRef(navigation.state);
  navStateRef.current = navigation.state;
  // click 事件没有 pointerType，只能靠最近的 pointerdown 记忆 —— 键盘/辅助点击
  // 没有 pointerdown，正好用空串把它们挡在门外
  const lastPointerType = useRef('');

  useEffect(() => {
    const TAPPABLE =
      'button, a[href], [role="button"], summary, input[type="submit"], input[type="button"], select, label';

    const clearPending = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (pendingRef.current) {
        pendingRef.current.classList.remove('tap-pending');
        pendingRef.current = null;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      lastPointerType.current = e.pointerType;
    };

    // 键盘激活也会触发 click（无 pointerdown），把它从「触屏」里排除
    const onKeyDown = () => {
      lastPointerType.current = '';
    };

    const onClick = (e: MouseEvent) => {
      if (lastPointerType.current !== 'touch') return;
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.(TAPPABLE) as HTMLElement | null;
      if (!el) return;
      // 换到新元素：先摘掉上一个的 pending（含它未到期的计时器）
      if (pendingRef.current) pendingRef.current.classList.remove('tap-pending');
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingRef.current = el;
      el.classList.add('tap-pending');
      // 兜底：非导航动作最多保持 1.5s；若是导航，下面的 navigation 分支会
      // 取消这个计时器，让反馈一直挂到加载结束
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (navStateRef.current === 'idle') clearPending();
      }, 1500);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('click', onClick, true);
      clearPending();
    };
  }, []);

  // 导航进行中：取消兜底计时器，让 .tap-pending 一直挂着。
  // 导航结束：稍等片刻再清（新页面已渲染，元素多半已卸载，清的是残留）。
  useEffect(() => {
    if (navigation.state !== 'idle') {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    } else if (pendingRef.current) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (pendingRef.current) {
          pendingRef.current.classList.remove('tap-pending');
          pendingRef.current = null;
        }
      }, 500);
    }
  }, [navigation.state]);

  return null;
}
