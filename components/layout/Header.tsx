import { Link, useLocation } from 'react-router';
import { useMemo } from 'react';
import { siteConfig } from '@/lib/config/site';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Icon } from '@/components/ui/icon';

export function Header() {
  const { pathname } = useLocation();

  const crumbs = useMemo(() => {
    const path = pathname.replace(/\/$/, '') || '/';
    if (path === '/') return [];
    const parts = path.split('/').filter(Boolean);
    const result: { label: string; href: string }[] = [];
    let accumulated = '';
    for (const part of parts) {
      accumulated += '/' + part;
      result.push({ label: part, href: accumulated });
    }
    return result;
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="relative flex h-10 items-center justify-between px-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 min-w-0">
          <Link
            to="/"
            className="shrink-0 hover:opacity-80 transition-opacity"
          >
            <img src={siteConfig.icon} alt="Home" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full" />
          </Link>
          {crumbs.map((crumb, i) => (
            <div key={crumb.href} className="inline-flex items-center gap-1">
              <span className="text-muted-foreground/40 shrink-0">/</span>
              <Link
                to={crumb.href}
                className={`text-xs truncate shrink min-w-0 transition-colors ${
                  i === crumbs.length - 1
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {crumb.label}
              </Link>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile nav */}
          <Sheet>
            <SheetTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors md:hidden">
              <Icon icon="mdi:menu" className="size-4" />
              <span className="sr-only">菜单</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle className="text-left">导航</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 mt-4">
                {siteConfig.navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  >
                    <Icon icon={link.icon} className="size-4 text-muted-foreground" />
                    <span>{link.label}</span>
                    {link.badge && (
                      <span className="ml-auto text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
