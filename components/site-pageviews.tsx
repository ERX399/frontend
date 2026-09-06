'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { getSitePageviews } from '@/lib/umami';

export function SitePageviews({ className }: { className?: string }) {
  const [views, setViews] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    getSitePageviews().then((n) => {
      if (!cancelled && typeof n === 'number') setViews(n);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  if (views === null) return null;
  return (
    <span className={className || 'inline-flex items-center gap-1 text-sm text-muted-foreground'}>
      <Icon icon="mdi:eye-outline" className="size-3.5" />
      {views.toLocaleString()} 次浏览
    </span>
  );
}
