import { useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { SpaToggleItem, useDisableSpa } from '@/components/spa-toggle';
import { SITE_ICON, SITE_NAME, NAV_LINKS, PRIMARY_NAV, TOOLS_NAV, EXTERNAL_NAV } from '@/lib/nav';

const navLinkClass =
  'flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-background rounded-md hover:bg-foreground transition-colors';

const extLinkSvg = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3 opacity-40">
    <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
  </svg>
);

export function SiteHeader() {
  const mobileRef = useRef<HTMLDetailsElement>(null);
  const toolsRef = useRef<HTMLDetailsElement>(null);
  // 桌面下拉与移动抽屉各渲染一份开关，共用这一份状态
  const [spaDisabled, setSpaDisabled] = useDisableSpa();
  const closeMobile = useCallback(() => {
    if (mobileRef.current) mobileRef.current.open = false;
  }, []);
  const closeTools = useCallback(() => {
    if (toolsRef.current) toolsRef.current.open = false;
  }, []);

  // 桌面端「工具」下拉：<details> 原生只认再点一次 summary，点空白处不会收起。
  // 这里补的是**纯增强**——无 JS 时下拉照样能开合，只是少了点外部关闭这一路。
  // 用 pointerdown 而非 click：链接的 click 会带着导航一起走，pointerdown 先到，
  // 收起动作不会被导航打断。
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const el = toolsRef.current;
      if (el?.open && !el.contains(e.target as Node)) el.open = false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (toolsRef.current?.open) {
        toolsRef.current.open = false;
        toolsRef.current.querySelector('summary')?.focus();
      }
      if (mobileRef.current?.open) mobileRef.current.open = false;
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const primaryLinks  = NAV_LINKS.filter((l) => PRIMARY_NAV.includes(l.label));
  const toolLinks     = NAV_LINKS.filter((l) => TOOLS_NAV.includes(l.label));
  const externalLinks = EXTERNAL_NAV
    .map((label) => NAV_LINKS.find((l) => l.label === label))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  return (
    <header className="fixed inset-x-0 top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 flex h-14 items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity">
          <img src={SITE_ICON} alt="logo" width={28} height={28} className="h-7 w-7 rounded-full" />
          <span className="font-semibold text-sm tracking-tight">{SITE_NAME}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center">
          {primaryLinks.map((link) => {
            const isExternal = link.href.startsWith('http');
            return isExternal ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={navLinkClass}
              >
                <Icon icon={link.icon} className="size-4" />
                {link.label}
                {link.badge && (
                  <Badge className="px-1.5 py-px text-[10px]">{link.badge}</Badge>
                )}
              </a>
            ) : (
              <Link key={link.href} to={link.href} className={navLinkClass}>
                <Icon icon={link.icon} className="size-4" />
                {link.label}
                {link.badge && (
                  <Badge className="px-1.5 py-px text-[10px]">{link.badge}</Badge>
                )}
              </Link>
            );
          })}

          {/* 工具下拉 —— 纯 CSS <details>，禁用 JS 也能展开 */}
          <details ref={toolsRef} className="relative group">
            <summary className={`${navLinkClass} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
              <Icon icon="mdi:toolbox-outline" className="size-4" />
              工具
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 opacity-60 transition-transform group-open:rotate-180">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </summary>
            {/* 同移动端：有 JS 时 <Link> 走客户端导航、页面不重载，
                details 会一直开着，点到链接就手动合上 */}
            <div
              className="absolute left-0 top-full z-50 mt-2 w-max min-w-32 border border-foreground/80 bg-popover p-1 font-mono text-popover-foreground animate-[shell-fade-in_75ms_linear]"
              onClick={(e) => { if ((e.target as HTMLElement).closest('a')) closeTools(); }}
            >
              {toolLinks.map((link) => (
                <Link key={link.href} to={link.href} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background outline-none">
                  <Icon icon={link.icon} className="size-4 text-muted-foreground" />
                  {link.label}
                </Link>
              ))}
              {externalLinks.length > 0 && (
                <>
                  <div className="-mx-1 my-1 h-px bg-border" />
                  {externalLinks.map((link) => (
                    <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background outline-none">
                      <Icon icon={link.icon} className="size-4 text-muted-foreground" />
                      {link.label}
                      {extLinkSvg}
                    </a>
                  ))}
                </>
              )}
              <div className="-mx-1 my-1 h-px bg-border" />
              <SpaToggleItem
                id="spa-toggle-desktop"
                checked={spaDisabled}
                onChange={setSpaDisabled}
                className="gap-2 px-2 py-1.5"
              />
            </div>
          </details>
        </nav>

        {/* Mobile hamburger —— 原生 <details>，与桌面端「工具」下拉同一套路。
            之前用 Sheet（useState 驱动）：禁用 JS 时按钮点了没反应，移动端访客
            除了 logo 什么都点不到。<details> 由浏览器自己管开合，无 JS 照样能用。 */}
        <details ref={mobileRef} className="md:hidden">
          <summary className="inline-flex items-center justify-center h-9 w-9 rounded-md cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-foreground transition-colors text-muted-foreground hover:text-background">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
            <span className="sr-only">菜单</span>
          </summary>

          {/* 用 absolute 而不是 fixed：header 带 backdrop-blur-md，
              而 backdrop-filter 会让该元素成为固定定位后代的**包含块**，
              fixed 抽屉会被压进 56px 高的 header 里（实测面板整个塌掉）。
              header 本身是 fixed inset-x-0，绝对定位相对它即等价于相对视口。 */}
          <div
            className="absolute inset-x-0 top-full h-[calc(100dvh-3.5rem)] bg-background/80"
            aria-hidden
            onClick={closeMobile}
          />
          <div className="absolute right-0 top-full h-[calc(100dvh-3.5rem)] w-72 flex flex-col border-l border-border bg-background p-4 overflow-y-auto">
            <div className="flex items-center gap-2.5 font-semibold text-sm">
              <img src={SITE_ICON} alt="" width={24} height={24} loading="lazy" className="h-6 w-6 rounded-full" />
              {SITE_NAME}
            </div>

            {/* 有 JS 时 <Link> 走客户端导航、页面不重载，details 会一直开着，
                所以点到链接就手动合上；无 JS 时是整页跳转，天然重置。 */}
            <div className="flex flex-col gap-1 mt-6 flex-1" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) closeMobile(); }}>
              {primaryLinks.map((link) => {
                const isExternal = link.href.startsWith('http');
                return isExternal ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-md hover:bg-foreground hover:text-background transition-colors"
                  >
                    <Icon icon={link.icon} className="size-4 text-muted-foreground shrink-0" />
                    <span>{link.label}</span>
                    {link.badge && (
                      <Badge className="ml-auto px-1.5 py-px text-[10px]">{link.badge}</Badge>
                    )}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-md hover:bg-foreground hover:text-background transition-colors"
                  >
                    <Icon icon={link.icon} className="size-4 text-muted-foreground shrink-0" />
                    <span>{link.label}</span>
                    {link.badge && (
                      <Badge className="ml-auto px-1.5 py-px text-[10px]">{link.badge}</Badge>
                    )}
                  </Link>
                );
              })}

              <div className="mt-3 mb-1 px-3">
                <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">工具</p>
              </div>
              {toolLinks.map((link) => (
                <Link key={link.href} to={link.href} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-md hover:bg-foreground hover:text-background transition-colors">
                  <Icon icon={link.icon} className="size-4 text-muted-foreground shrink-0" />
                  <span>{link.label}</span>
                </Link>
              ))}
              {externalLinks.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-md hover:bg-foreground hover:text-background transition-colors">
                  <Icon icon={link.icon} className="size-4 text-muted-foreground shrink-0" />
                  <span>{link.label}</span>
                  {extLinkSvg}
                </a>
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
          </div>
        </details>
      </div>
    </header>
  );
}