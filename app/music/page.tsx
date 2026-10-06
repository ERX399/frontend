'use client';

import { Icon } from '@/components/ui/icon';
import { MusicClient } from '@/components/music/music-client';

export default function MusicPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Icon icon="lucide:music" className="size-5" />
        <h1 className="text-2xl font-bold">音乐解析</h1>
        <span className="border border-border px-2 py-0.5 text-xs text-muted-foreground">
          测试页
        </span>
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        粘贴网易云 / 酷狗的分享链接或关键词解析试听。接口来自公开第三方服务，可能随时失效；
        失效时可切换到「本地上传」解析本地音频文件。
      </p>

      <MusicClient />
    </main>
  );
}
