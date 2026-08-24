import { Outlet } from 'react-router';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { Analytics } from '@/components/analytics';
import { CookieConsent } from '@/components/cookie-consent';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/sonner';
import { SeoManager } from '@/components/seo-manager';
import { FloatingActions } from '@/components/floating-actions';
import { CodeCopyListener } from '@/components/code-copy-listener';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SeoManager />
      <SiteHeader />
      <div className="flex-1 flex flex-col min-h-0 pt-14">
        <Outlet />
      </div>
      <Footer />
      <FloatingActions />
      <CodeCopyListener />
      <CookieConsent />
      <Toaster />
      <Analytics />
    </ThemeProvider>
  );
}
