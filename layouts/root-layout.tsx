import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { Analytics } from '@/components/analytics';
import { CookieConsent } from '@/components/cookie-consent';
import { Sidebar, useSidebarMode } from '@/components/layout/Sidebar';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/sonner';
import { SeoManager } from '@/components/seo-manager';
import { FloatingActions } from '@/components/floating-actions';
import { CodeCopyListener } from '@/components/code-copy-listener';

export default function RootLayout() {
  const [mode, toggleMode] = useSidebarMode();
  const collapsed = mode === 'icon';

  // 侧栏宽度写在 CSS 变量里，浮动按钮靠它让位。折叠态是另一套宽度，
  // 用根元素属性切换（React state 进不了纯 CSS 选择器）。
  useEffect(() => {
    document.documentElement.dataset.sidebar = mode;
  }, [mode]);

  return (
    <ThemeProvider>
      <SeoManager />
      {/* 主区在左、（可折叠的）侧栏在右。侧栏本体是 fixed，靠 Sidebar 内部的占位
          div 在主区右侧撑开宽度；窄屏时侧栏整体隐藏，导航走顶栏里的抽屉。 */}
      <div className="flex min-h-dvh w-full">
        <div className="relative flex w-full min-w-0 max-w-full flex-1 flex-col bg-background">
          <SiteHeader />
          <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col">
            <Outlet />
          </div>
          <Footer />
        </div>
        <Sidebar mode={mode} />
      </div>

      {/* 折叠开关固定在视口右上角：无论侧栏宽窄、窗口怎么缩放，它都在同一个像素上，
          不会随侧栏宽度变化而左右滑动。侧栏顶部那一行刻意留出了它的位置。 */}
      <button
        type="button"
        onClick={toggleMode}
        aria-label={collapsed ? '展开侧栏' : '折叠侧栏'}
        aria-pressed={collapsed}
        title={collapsed ? '展开侧栏' : '折叠侧栏'}
        className="fixed end-2 top-2 z-40 hidden size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:flex"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
        </svg>
      </button>

      <FloatingActions />
      <CodeCopyListener />
      <CookieConsent />
      <Toaster />
      <Analytics />
    </ThemeProvider>
  );
}
