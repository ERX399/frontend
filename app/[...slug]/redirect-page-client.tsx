'use client';

import { useEffect } from 'react';
import { siteConfig } from '@/lib/config/site';
import { Spinner } from '@/components/ui/spinner';

interface RedirectPageClientProps {
  destination: string;
}

export function RedirectPageClient({ destination }: RedirectPageClientProps) {
  const resolved = destination.startsWith('http')
    ? destination
    : `https://${new URL(siteConfig.url).hostname}${destination}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = resolved;
    }, 2000);
    return () => clearTimeout(timer);
  }, [resolved]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="text-center max-w-sm w-full">
        <div className="inline-flex p-6 rounded-full bg-primary/10 mb-6">
          <svg
            className="w-16 h-16 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" />
            <path d="M12 16l4-4-4-4M8 12h8" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-4">正在重定向</h1>
        <p className="text-lg text-muted-foreground mb-6">
          {siteConfig.bio.name} 正在将您重定向至
        </p>
        <div className="p-4 rounded-lg border bg-muted/50 mb-6 break-all">
          <code className="text-sm font-mono">{resolved}</code>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
          <Spinner className="size-4" />
          <span>请稍候...</span>
        </div>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            如果没有自动跳转，请点击下方按钮
          </p>
          <a
            href={resolved}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium no-underline hover:opacity-90 transition-opacity"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            手动跳转
          </a>
        </div>
      </div>
    </div>
  );
}
