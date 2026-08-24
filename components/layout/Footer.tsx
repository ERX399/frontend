import { Icon } from '@/components/ui/icon';
import { COOKIE_PREFERENCES_LABEL } from '@/lib/constants';

declare const __BUILD_LABEL__: string;

export function Footer() {
  return (
    <footer className="mt-8 border-t pt-6 pb-8">
      <div className="container mx-auto flex flex-col items-center gap-2 text-sm text-muted-foreground">
        {/* 一行信息：窄屏必须能换行，否则链接会顶出容器 */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <a href="#" id="open_preferences_center" className="inline-flex shrink-0 items-center gap-1 underline hover:text-foreground transition-colors"><Icon icon="mdi:cookie-outline" className="size-3.5" />
            {COOKIE_PREFERENCES_LABEL}
          </a>
        </div>
        <p>&copy; 2026 夏若倾心</p>
        {/* 不要再降透明度：/60 时对比度只有 3.3:1，达不到 WCAG AA 的 4.5:1 */}
        <small className="text-xs text-muted-foreground">构建时间：{__BUILD_LABEL__}</small>
      </div>
    </footer>
  );
}
