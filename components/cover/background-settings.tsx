'use client';

import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface BackgroundSettingsProps {
  bgImage: string | null;
  bgBlur: number;
  bgOpacity: number;
  isBgDragOver: boolean;
  onBgImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBgBlurChange: (v: number) => void;
  onBgOpacityChange: (v: number) => void;
  onBgImageRemove: () => void;
  onBgDragOver: (e: React.DragEvent) => void;
  onBgDragLeave: (e: React.DragEvent) => void;
  onBgDrop: (e: React.DragEvent) => void;
}

export function BackgroundSettings({
  bgImage,
  bgBlur,
  bgOpacity,
  isBgDragOver,
  onBgImageUpload,
  onBgBlurChange,
  onBgOpacityChange,
  onBgImageRemove,
  onBgDragOver,
  onBgDragLeave,
  onBgDrop,
}: BackgroundSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>背景图片</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={onBgImageUpload}
            className="hidden"
            id="bg-upload"
          />
          <Label
            htmlFor="bg-upload"
            className={`flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary ${
              isBgDragOver ? 'border-primary bg-primary/10' : ''
            }`}
            onDragOver={onBgDragOver}
            onDragLeave={onBgDragLeave}
            onDrop={onBgDrop}
          >
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Icon icon="mdi:upload" className="h-6 w-6" />
              <span className="text-xs">
                {isBgDragOver ? '松开上传' : bgImage ? '点击或拖拽更换' : '点击或拖拽上传'}
              </span>
            </div>
          </Label>
        </div>

        {bgImage && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>模糊: {bgBlur}px</Label>
              <Button variant="destructive" size="sm" onClick={onBgImageRemove}>
                <Icon icon="mdi:delete" className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-6">0</span>
              <input
                type="range"
                value={bgBlur}
                onChange={(e) => onBgBlurChange(Number(e.target.value))}
                min={0}
                max={20}
                className="flex-1 h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">20</span>
            </div>

            <Label>不透明度: {Math.round(bgOpacity * 100)}%</Label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-6">0%</span>
              <input
                type="range"
                value={bgOpacity}
                onChange={(e) => onBgOpacityChange(Number(e.target.value))}
                min={0}
                max={1}
                step={0.01}
                className="flex-1 h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">100%</span>
            </div>

            <p className="text-xs text-muted-foreground">提示: 拖拽移动位置，滚轮缩放大小</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
