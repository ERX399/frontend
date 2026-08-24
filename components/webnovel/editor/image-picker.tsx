'use client';

/**
 * 图片历史选择器：从当前作品所有页面里收集用过的图片，缩略图点选即填。
 *
 * 解决的问题：第二页想复用第一页的图时，既不用回去复制那串地址，
 * 也不用把同一张图再传一遍。
 */
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { webnovelImageUrl } from '@/lib/webnovel/api/client';
import type { NovelPage } from '@/lib/webnovel/types';

/** 收集作品里所有页面用过的图片路径（去重，保持出现顺序） */
export function collectUsedImages(pages: NovelPage[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of pages) {
    for (const a of p.actions || []) {
      if (a.type === 'image' && a.image && !seen.has(a.image)) {
        seen.add(a.image);
        out.push(a.image);
      }
    }
  }
  return out;
}

export function ImagePicker({
  images,
  current,
  onPick,
  onClose,
}: {
  images: string[];
  current?: string;
  onPick: (image: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="border border-border p-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground">本作品用过的图片（{images.length}）</p>
        <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="关闭图片选择">
          <Icon icon="mdi:close" className="size-3.5" />
        </Button>
      </div>
      {images.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">还没有用过的图片。先在任意页面上传一张。</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {images.map((img) => {
            const active = img === current;
            return (
              <button
                key={img}
                type="button"
                onClick={() => onPick(img)}
                title={img}
                aria-label={`选择图片 ${img}`}
                className={`relative border ${active ? 'border-foreground' : 'border-border'} hover:border-foreground`}
              >
                <img
                  src={webnovelImageUrl(img)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-14 w-full object-cover"
                />
                {active && (
                  <span className="absolute right-0.5 top-0.5 bg-foreground text-background text-[10px] px-1">
                    当前
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
