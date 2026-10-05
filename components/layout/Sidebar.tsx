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
  'flex items-center gap-2.5 overflow-hidden px-3 py-2 font-heading text-sm font-semibold whitespace-nowrap transition-colors duration-100 active:bg-[var(--sidebar-accent)]';

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

            <div className="relative flex w-full min-w-0 flex-col p-2">
              {/* logo 行。这一行的高度始终保留 —— 折叠按钮 fixed 在视口右上角、
                  不随侧栏移动，行高一旦塌掉，第一个导航项就会顶上来跟按钮重叠。
                  折叠态不显示内容（3rem 里放不下站名）。
                  展开态右侧留出 --sidebar-toggle-size，避免文字被按钮压住。
                  下方加一条分隔线，与后面各组的分隔线呼应。 */}
              <div className="flex h-9 shrink-0 items-center border-b border-[var(--sidebar-border)] px-3 pe-[var(--sidebar-toggle-size)]">
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
                    <span className="truncate font-heading text-sm font-semibold tracking-tight">{SITE_NAME}</span>
                  </Link>
                )}
              </div>
            </div>

            {NAV_GROUPS.map((group, gi) => (
              <div
                key={group.label}
                className={
                  'relative flex w-full min-w-0 flex-col p-2' +
                  // 从第二组起，上方加一条分隔线把它和上一组分开
                  (gi > 0 ? ' mt-1 border-t border-[var(--sidebar-border)] pt-3' : '')
                }
              >
                {!collapsed && (
                  // 贴左对齐：缩进量 = 导航项的 px-3，与图标左边缘、上方分割线同一条竖线。
                  // 不跟导航文字对齐（那要多缩进 26px），标题会显得孤零零飘在中间。
                  <div className="flex h-7 shrink-0 items-center px-3 font-heading text-xs font-medium text-[var(--sidebar-muted-foreground)]">
                    <span>{group.label}</span>
                  </div>
                )}
                <ul className="flex w-full min-w-0 flex-col">
                  {group.links.map((link) => {
                    const external = link.href.startsWith('http');
                    const active = !external && isActive(link.href);
                    const cls =
                      itemBase +
                      (collapsed ? ' justify-center px-0' : '') +
                      (active
                        ? ' bg-[var(--sidebar-accent)] font-medium text-[var(--sidebar-accent-foreground)]'
                        : ' text-[var(--sidebar-muted-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]');

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
            <div className="flex flex-col gap-2 border-t border-[var(--sidebar-border)] p-4">
              <SitePageviews className="flex items-center gap-2 text-xs text-[var(--sidebar-muted-foreground)]" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
