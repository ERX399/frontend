'use client';

import { useCallback, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { track } from '@/lib/track';

interface FileItem {
  name: string;
  src: string;
  convertedUrl: string | null;
  done: boolean;
}

const FORMATS = [
  { mime: 'image/png', ext: 'png', label: 'PNG' },
  { mime: 'image/jpeg', ext: 'jpg', label: 'JPEG' },
  { mime: 'image/webp', ext: 'webp', label: 'WebP' },
  { mime: 'image/bmp', ext: 'bmp', label: 'BMP' },
  { mime: 'image/avif', ext: 'avif', label: 'AVIF' },
];

function getFormatLabel(mime: string): string {
  return FORMATS.find((f) => f.mime === mime)?.label || mime;
}

export default function ConvertPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [targetFormat, setTargetFormat] = useState('image/png');
  const [converting, setConverting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pendingRef = useRef<FileItem[]>([]);
  const currentIndexRef = useRef(0);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    if (!input.files?.length) return;
    const itemList: FileItem[] = [];
    let loaded = 0;
    const total = input.files.length;
    for (let i = 0; i < input.files.length; i++) {
      const f = input.files[i];
      const name = f.name.replace(/\.[^.]+$/, '');
      const item: FileItem = { name, src: '', convertedUrl: null, done: false };
      itemList.push(item);
      const reader = new FileReader();
      reader.onload = () => {
        item.src = reader.result as string;
        loaded++;
        if (loaded === total) {
          setFiles((prev) => [...prev, ...itemList]);
        }
      };
      reader.readAsDataURL(f);
    }
    input.value = '';
  }, []);

  const processNext = useCallback(() => {
    const idx = currentIndexRef.current;
    const pending = pendingRef.current;
    if (idx >= pending.length) {
      setConverting(false);
      return;
    }
    const item = pending[idx];
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const mime = targetFormat;
      const quality =
        mime === 'image/jpeg' || mime === 'image/webp' || mime === 'image/avif'
          ? 0.92
          : undefined;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            item.convertedUrl = url;
            item.done = true;
            const ext = FORMATS.find((f) => f.mime === targetFormat)?.ext || 'png';
            const a = document.createElement('a');
            a.href = url;
            a.download = `${item.name}.${ext}`;
            a.click();
            // 批量转换是一张一条：想看的是「转成了什么格式」的分布，不是有几个人点过
            track('使用工具', { 工具: '格式转换', 动作: '转换', 目标格式: ext });
          }
          setFiles([...pending]);
          currentIndexRef.current++;
          setCurrentIndex(currentIndexRef.current);
          setTimeout(() => processNext(), 100);
        },
        mime,
        quality,
      );
    };
    img.src = item.src;
  }, [targetFormat]);

  const convertAll = useCallback(() => {
    const pending = files.filter((f) => !f.done);
    if (!pending.length) return;
    setConverting(true);
    setTotalCount(pending.length);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    pendingRef.current = pending;
    processNext();
  }, [files, processNext]);

  const doneCount = files.filter((f) => f.done).length;

  return (
    <main className="w-full max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Icon icon="mdi:swap-horizontal-bold" className="size-6 text-primary" />
        <h1 className="text-xl font-bold">图片转换</h1>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label className="text-xs">选择图片</Label>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/bmp,image/avif,image/x-icon"
              onChange={handleFile}
              className="flex h-9 w-full items-center border border-input bg-background px-1.5 text-sm file:mr-3 file:px-3 file:py-1 file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">目标格式</Label>
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center justify-between gap-1 w-full h-8 rounded-lg border border-input bg-transparent px-3 text-sm text-left select-none focus-visible:outline-none focus:outline-none">
                  {getFormatLabel(targetFormat)}
                  <Icon icon="mdi:chevron-down" className="size-4 text-muted-foreground shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full min-w-[160px]">
                  {FORMATS.map((fmt) => (
                    <DropdownMenuItem key={fmt.mime} onClick={() => setTargetFormat(fmt.mime)}>
                      {fmt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={convertAll}
            disabled={!files.length || converting}
          >
            {converting ? <Spinner className="size-4 mr-1" /> : <Icon icon="mdi:swap-horizontal-bold" className="size-4 mr-1" />}
            {converting
              ? `转换中 ${currentIndex}/${totalCount}`
              : `转换 ${files.length} 个文件为 ${getFormatLabel(targetFormat)}`}
          </Button>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              已选择 {files.length} 个文件，{doneCount} 个已完成
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {files.map((f, idx) => (
                <div
                  key={idx}
                  className={`relative rounded-md overflow-hidden border ${
                    f.done ? 'ring-2 ring-green-500' : ''
                  }`}
                >
                  <img
                    src={f.src}
                    alt={f.name}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                    {f.name}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
