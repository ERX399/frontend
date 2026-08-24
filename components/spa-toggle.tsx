import { useCallback, useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const STORAGE_KEY = 'svaf:disable-spa';

/**
 * 「禁用 SPA」开关 —— 把站内点击退化成整页文档请求，用来对比客户端导航
 * 与整页导航的加载耗时（JS 照常下载执行，只是每次导航都要重新解析 + 水合）。
 *
 * 拦截装在 document 的**捕获阶段**：React 把事件委托挂在 root 容器上，
 * document 捕获跑在它前面，能赶在 RR 的 <Link> / <Form> 之前截下事件。
 * 只管 <a> 与 <form>，程序化 navigate()（发帖后跳转等）不受影响 —— 测速用不到，
 * 也不值得为此在业务代码里到处埋钩子。
 */
export function useDisableSpa() {
  const [disabled, setDisabled] = useState(false);

  // localStorage 只在 effect / 回调里碰，SSR 安全。整页刷新会清掉内存状态，
  // 开关本身要靠它活过跳转，否则点一次就自己失效了。
  useEffect(() => {
    try {
      setDisabled(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* 隐私模式下读取也可能抛错，维持默认关闭即可 */
    }
  }, []);

  const toggle = useCallback((next: boolean) => {
    setDisabled(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, '1');
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* 写不进去就只在当前页生效，不影响开关本身 */
    }
  }, []);

  useEffect(() => {
    if (!disabled) return;

    const onClick = (e: MouseEvent) => {
      // 新标签页 / 中键 / 已被别处处理过的点击一律放行
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target instanceof Element ? e.target : null;
      const anchor = target?.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return;
      // 同页锚点（目录跳转等）交给浏览器，别在这儿重载整页
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      location.href = url.href;
    };

    // 只 stopImmediatePropagation、不 preventDefault：把 RR 的 onSubmit 截掉之后，
    // 剩下的交给浏览器原生提交（论坛搜索是 <Form method="get">）
    const onSubmit = (e: SubmitEvent) => {
      if (e.target instanceof HTMLFormElement) e.stopImmediatePropagation();
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, [disabled]);

  return [disabled, toggle] as const;
}

/**
 * 开关的可视部分。桌面下拉与移动抽屉各渲染一份，共用 useDisableSpa 的同一份状态。
 *
 * 无 JS 时勾选不会生效 —— 但那种情况下所有导航本来就是整页请求，
 * 也就是说开关描述的行为已经是既成事实，不存在「点了没反应」的落差。
 */
export function SpaToggleItem({
  id,
  checked,
  onChange,
  className = '',
}: {
  /** 桌面下拉与移动抽屉各渲染一份，htmlFor 要能分别指到自己那个，id 由调用方给 */
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center ${className}`}>
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="flex-1 cursor-pointer">
        禁用 SPA
      </Label>
      <span className="shrink-0 text-[10px] text-muted-foreground/80">整页刷新</span>
    </div>
  );
}
