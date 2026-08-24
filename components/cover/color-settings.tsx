'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ColorSettingsProps {
  color: string;
  iconColor: string;
  bgColor: string;
  bgColorOpacity: number;
  linkColor: boolean;
  useOriginalIconColor: boolean;
  onColorChange: (newColor: string, type: 'text' | 'icon') => void;
  onBgColorChange: (v: string) => void;
  onBgColorOpacityChange: (v: number) => void;
  onLinkColorChange: (v: boolean) => void;
  onUseOriginalIconColorChange: (v: boolean) => void;
}

export function ColorSettings({
  color,
  iconColor,
  bgColor,
  bgColorOpacity,
  linkColor,
  useOriginalIconColor,
  onColorChange,
  onBgColorChange,
  onBgColorOpacityChange,
  onLinkColorChange,
  onUseOriginalIconColorChange,
}: ColorSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>颜色设置</span>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={linkColor} onCheckedChange={(c) => onLinkColorChange(!!c)} />
              <span className="text-sm font-normal">颜色同步</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={useOriginalIconColor}
                onCheckedChange={(c) => onUseOriginalIconColorChange(!!c)}
              />
              <span className="text-sm font-normal">原色图标</span>
            </label>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>文字颜色</Label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={color}
              onChange={(e) => onColorChange(e.target.value, 'text')}
              className="w-24 h-8 text-xs rounded-lg border border-input bg-transparent px-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value, 'text')}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>图标颜色</Label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={iconColor}
              disabled={useOriginalIconColor}
              onChange={(e) => onColorChange(e.target.value, 'icon')}
              className="w-24 h-8 text-xs rounded-lg border border-input bg-transparent px-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
            <input
              type="color"
              value={iconColor}
              disabled={useOriginalIconColor}
              onChange={(e) => onColorChange(e.target.value, 'icon')}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>背景颜色</Label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={bgColor}
              onChange={(e) => onBgColorChange(e.target.value)}
              className="w-24 h-8 text-xs rounded-lg border border-input bg-transparent px-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <input
              type="color"
              value={bgColor}
              onChange={(e) => onBgColorChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>背景不透明度: {Math.round(bgColorOpacity * 100)}%</Label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-6">0%</span>
            <input
              type="range"
              value={bgColorOpacity}
              onChange={(e) => onBgColorOpacityChange(Number(e.target.value))}
              min={0}
              max={1}
              step={0.01}
              className="flex-1 h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
