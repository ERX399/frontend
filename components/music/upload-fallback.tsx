'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { parseLocalAudio, type LocalAudio } from '@/lib/music';

interface Props {
  onPick: (audio: LocalAudio) => void;
}

/** 图标子集扫描脚本只认紧跟在 icon: 后面的字符串字面量，故抽成对象数组 */
const UPLOAD_ICONS = [
  { icon: 'lucide:upload' },
  { icon: 'lucide:loader-circle' },
] as const;

export function UploadFallback({ onPick }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const audio = await parseLocalAudio(file);
      onPick(audio);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
      className={
        'flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed p-8 text-center transition-colors ' +
        (dragging ? 'border-foreground bg-foreground/5' : 'border-border hover:bg-foreground/5')
      }
    >
      <Icon
        icon={UPLOAD_ICONS[busy ? 1 : 0].icon}
        className={'size-6 text-muted-foreground' + (busy ? ' animate-spin' : '')}
      />
      <p className="text-sm">拖入本地音频，或点击选择</p>
      <p className="text-xs text-muted-foreground">
        支持普通音频（mp3 / flac / m4a / ogg）与网易云 .ncm 加密文件
      </p>
      <p className="text-xs text-muted-foreground/70">纯本地处理不上传</p>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.ncm"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  );
}
