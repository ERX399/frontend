'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SizeSettingsProps {
  fontSize: number;
  iconSize: number;
  iconRadius: number;
  gap: number;
  linkScale: boolean;
  onFontSizeChange: (v: number) => void;
  onIconSizeChange: (v: number) => void;
  onIconRadiusChange: (v: number) => void;
  onGapChange: (v: number) => void;
  onLinkScaleChange: (v: boolean) => void;
}

export function SizeSettings({
  fontSize,
  iconSize,
  iconRadius,
  gap,
  linkScale,
  onFontSizeChange,
  onIconSizeChange,
  onIconRadiusChange,
  onGapChange,
  onLinkScaleChange,
}: SizeSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>尺寸设置</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={linkScale} onCheckedChange={(c) => onLinkScaleChange(!!c)} />
            <span className="text-sm font-normal">等比缩放</span>
          </label>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>字体大小: {fontSize}px</Label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-6">20</span>
            <input
              type="range"
              value={fontSize}
              onChange={(e) => onFontSizeChange(Number(e.target.value))}
              min={20}
              max={700}
              className="flex-1 h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">700</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>图标大小: {iconSize}px</Label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-6">20</span>
            <input
              type="range"
              value={iconSize}
              onChange={(e) => onIconSizeChange(Number(e.target.value))}
              min={20}
              max={700}
              className="flex-1 h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">700</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>图标圆角: {iconRadius}%</Label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-6">0</span>
            <input
              type="range"
              value={iconRadius}
              onChange={(e) => onIconRadiusChange(Number(e.target.value))}
              min={0}
              max={50}
              className="flex-1 h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">50</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>间距: {gap}px</Label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-6">0</span>
            <input
              type="range"
              value={gap}
              onChange={(e) => onGapChange(Number(e.target.value))}
              min={0}
              max={200}
              className="flex-1 h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">200</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
