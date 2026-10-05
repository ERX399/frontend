import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { SitePageviews } from '@/components/site-pageviews';
import { SITE_ICON, SITE_NAME, NAV_GROUPS } from '@/lib/nav';

export type SidebarMode = 'expanded' | 'icon';

const STORAGE_KEY = 'sidebar-mode';

/** 折叠状态存 localStorage：刷新后保持用户上次的选择 */
export function useSidebarMode(): [SidebarMode, () => void] {
  const [mode, setMode] = useState<SidebarMode>('expanded');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'icon' || saved === 'expanded') setMode(saved);
    } catch {}
  }, []);

  const toggle = () => {
    setMode((prev) => {
      const next: SidebarMode = prev === 'expanded' ? 'icon' : 'expanded';
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      return next;
    });
  };

  return [mode, toggle];
}

const itemBase =
  'flex items-center gap-2.5 overflow-hidden px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-100 active:bg-[var(--sidebar-accent)]';

export function Sidebar({ mode }: { mode: SidebarMode }) {
  const { pathname } = useLocation();
  const collapsed = mode === 'icon';
  const width = collapsed ? 'var(--sidebar-width-icon)' : 'var(--sidebar-width)';

  const isActive = (href: string) =>
    href !== '/' && pathname.startsWith(href)
      ? true
      : href === '/' && pathname === '/';

  return (
    <>
      {/* 占位：在文档流里撑开主内容区右侧的宽度（侧栏贴屏幕右边）。
          侧栏本体是 fixed 不占位，两者用同一个 width 变量保持同步。 */}
      <div
        className="relative hidden shrink-0 transition-[width] duration-100 ease-in-out md:block"
        style={{ width }}
        aria-hidden="true"
      />

      <div
        data-slot="sidebar"
        data-state={mode}
        className="fixed inset-y-0 end-0 z-20 hidden border-e-0 border-s border-[var(--sidebar-border)] transition-[width] duration-100 ease-in-out md:flex"
        style={{ width }}
      >
        <div className="relative flex size-full flex-col overflow-hidden bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto">

            <div className="relative flex w-full min-w-0 flex-col">
              {/* logo 行。这一行的高度始终保留 —— 折叠按钮 fixed 在视口右上角、
                  不随侧栏移动，行高一旦塌掉，第一个导航项就会顶上来跟按钮重叠。
                  折叠态不显示内容（3rem 里放不下站名）。
                  展开态右侧留出 --sidebar-toggle-size，避免文字被按钮压住。
                  下方加一条分隔线，与后面各组的分隔线呼应。
                  分隔线通栏：左右缩进不能放在外层容器上，否则线会被一起缩进去 */}
              <div className="flex h-[var(--site-header-height)] shrink-0 items-center px-3 pe-[var(--sidebar-toggle-size)]">
                {!collapsed && (
                  <Link
                    to="/"
                    className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-80"
                  >
                    <img
                      src={SITE_ICON}
                      alt={SITE_NAME}
                      width={24}
                      height={24}
                      referrerPolicy="no-referrer"
                      className="size-6 shrink-0 rounded-full"
                    />
                    <span className="truncate text-sm font-semibold tracking-tight">{SITE_NAME}</span>
                  </Link>
                )}
              </div>
              {/* 用实体 div 画线而不是 border-b：border 的粗细受 DPR 影响会舍入，
                  跟组间线的粗细对不齐。
                  -mt-px 让这条线和主区顶栏的 border-b 落在同一条水平线上：
                  顶栏的线画在 41px 高的盒子内侧（占 40.2~41），这条线是从 41
                  往下新增的，不往上提 1px 就会比顶栏低一像素 */}
              <div className="-mt-px h-px shrink-0 bg-[var(--sidebar-border)]" />
            </div>

            {NAV_GROUPS.map((group, gi) => (
              <div
                key={group.label}
                className={
                  'relative flex w-full min-w-0 flex-col' +
                  (gi > 0 ? ' mt-1 pt-2' : '')
                }
              >
                {gi > 0 && (
                  // 组间分隔线单独成一条，不挂在容器 border 上：容器带 border 时
                  // 线的左右端点被容器的 padding 牵着走，没法单独调缩进。
                  // 只有侧栏最顶上那条（logo 行下方）通栏，其余组间线统一缩进 7px
                  <div className="mb-2 h-px shrink-0 bg-[var(--sidebar-border)] mx-[7px]" />
                )}
                {!collapsed && (
                  // 贴左对齐：缩进量 = 导航项的文字缩进（外层 px-2 + 链接自身 px-3 = 20px），
                  // 与图标左边缘、上方分割线同一条竖线。
                  // 不跟导航文字对齐（那要多缩进 26px），标题会显得孤零零飘在中间。
                  <div className="flex h-7 shrink-0 items-center px-5 text-xs font-medium text-[var(--sidebar-foreground)]/70">
                    <span>{group.label}</span>
                  </div>
                )}
                <ul className="flex w-full min-w-0 flex-col px-2">
                  {group.links.map((link) => {
                    const external = link.href.startsWith('http');
                    const active = !external && isActive(link.href);
                    const cls =
                      itemBase +
                      (collapsed ? ' justify-center px-0' : '') +
                      (active
                        ? ' bg-[var(--sidebar-accent)] font-medium text-[var(--sidebar-accent-foreground)]'
                        : ' text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]');

                    const inner = (
                      <>
                        <Icon icon={link.icon} className="size-4 shrink-0" />
                        {!collapsed && <span className="truncate">{link.label}</span>}
                      </>
                    );

                    return (
                      <li key={link.href} className="relative">
                        {external ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cls}
                            title={collapsed ? link.label : undefined}
                          >
                            {inner}
                          </a>
                        ) : (
                          <Link
                            to={link.href}
                            className={cls}
                            title={collapsed ? link.label : undefined}
                            aria-current={active ? 'page' : undefined}
                          >
                            {inner}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {!collapsed && (
            <div className="flex flex-col">
              {/* 分隔线拎在 p-4 外面：放在里面的话 p-4 的 16px 会和 mx 叠在一起，
                  缩进量就不是 7px 了。 */}
              <div className="h-px shrink-0 bg-[var(--sidebar-border)] mx-[7px]" />
              <SitePageviews className="flex items-center gap-2 p-4 text-xs text-[var(--sidebar-foreground)]/70" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
