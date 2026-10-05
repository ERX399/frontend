import { useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { SpaToggleItem, useDisableSpa } from '@/components/spa-toggle';
import { SitePageviews } from '@/components/site-pageviews';
import { SITE_NAME, NAV_GROUPS, NAV_LINKS } from '@/lib/nav';

const extLinkSvg = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3 opacity-40">
    <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
  </svg>
);

/** 当前路径对应的页面标题与列表页入口，用于顶栏左侧。
    匹配规则与侧栏高亮保持一致：'/' 只在精确命中时算数，否则会被 startsWith 吃掉全部路径。
    标题可点：详情页（/posts/x）点回它的列表页（/posts），列表页本身则回到首页。
    没有匹配（如 404）时给不出链接，退化成纯文本。 */
function usePageTitle(): { title: string; href: string | null } {
  const { pathname } = useLocation();
  const match = NAV_LINKS
    .filter((l) => {
      if (l.href.startsWith('http')) return false;
      return l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
    })
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (!match) return { title: SITE_NAME, href: null };
  // 已经在列表页本身时，点它回首页（否则点了没反应）
  return { title: match.label, href: pathname === match.href ? '/' : match.href };
}

export function SiteHeader() {
  const mobileRef = useRef<HTMLDetailsElement>(null);
  const { title, href } = usePageTitle();
  const [spaDisabled, setSpaDisabled] = useDisableSpa();
  const closeMobile = useCallback(() => {
    if (mobileRef.current) mobileRef.current.open = false;
  }, []);

  // Esc 关移动端抽屉（桌面下拉已随导航一起移除）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileRef.current?.open) mobileRef.current.open = false;
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-[var(--site-header-height)] shrink-0 items-stretch border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex min-w-0 flex-1 items-center px-4">
        {href ? (
          <Link
            to={href}
            className="truncate text-sm font-medium transition-colors hover:text-muted-foreground"
          >
            {title}
          </Link>
        ) : (
          <span className="truncate text-sm font-medium">{title}</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 px-3">
        {/* 桌面端的侧栏折叠开关已挪到侧栏顶部（与 logo 同一行），这里只保留
            移动端抽屉 —— 小屏侧栏整体隐藏，没有可折叠的对象。 */}

        {/* 移动端抽屉：<details> 原生开合，禁用 JS 也能用 */}
        <details ref={mobileRef} className="md:hidden">
          <summary className="flex size-9 cursor-pointer list-none items-center justify-center text-muted-foreground transition-colors hover:bg-foreground hover:text-background [&::-webkit-details-marker]:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
            <span className="sr-only">菜单</span>
          </summary>

          {/* absolute 而非 fixed：header 的 backdrop-blur 会成为固定定位后代的包含块 */}
          <div
            className="absolute inset-x-0 top-full h-[calc(100dvh-var(--site-header-height))] bg-background/80"
            aria-hidden
            onClick={closeMobile}
          />
          <div className="absolute end-0 top-full flex h-[calc(100dvh-var(--site-header-height))] w-72 flex-col overflow-y-auto border-s border-border bg-background p-4">
            {/* 抽屉由顶栏的 ☰ 打开，logo/站名已在顶栏那一行出现过，这里不再重复 */}
            <div
              className="flex flex-1 flex-col gap-1"
              onClick={(e) => { if ((e.target as HTMLElement).closest('a')) closeMobile(); }}
            >
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="flex flex-col gap-1">
                  <div className="mt-3 mb-1 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
                    {group.label}
                  </div>
                  {group.links.map((link) => {
                    const external = link.href.startsWith('http');
                    const cls = 'flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-foreground hover:text-background';
                    const inner = (
                      <>
                        <Icon icon={link.icon} className="size-4 shrink-0 text-muted-foreground" />
                        <span>{link.label}</span>
                        {external && extLinkSvg}
                      </>
                    );
                    return external ? (
                      <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={cls}>
                        {inner}
                      </a>
                    ) : (
                      <Link key={link.href} to={link.href} className={cls}>
                        {inner}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-2 border-t border-border pt-3">
              <SpaToggleItem
                id="spa-toggle-mobile"
                checked={spaDisabled}
                onChange={setSpaDisabled}
                className="gap-3 px-3 py-2.5"
              />
            </div>

            <div className="mt-4 border-t border-border bg-muted/40 px-3 py-2.5">
              <SitePageviews className="flex items-center gap-2 text-sm text-muted-foreground" />
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
