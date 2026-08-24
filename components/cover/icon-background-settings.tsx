'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface IconBackgroundSettingsProps {
  iconBgEnabled: boolean;
  iconBgColor: string;
  iconBgPadding: number;
  iconBgRadius: number;
  iconBgBlur: number;
  iconBgOpacity: number;
  onIconBgEnabledChange: (v: boolean) => void;
  onIconBgColorChange: (v: string) => void;
  onIconBgPaddingChange: (v: number) => void;
  onIconBgRadiusChange: (v: number) => void;
  onIconBgBlurChange: (v: number) => void;
  onIconBgOpacityChange: (v: number) => void;
}

export function IconBackgroundSettings({
  iconBgEnabled,
  iconBgColor,
  iconBgPadding,
  iconBgRadius,
  iconBgBlur,
  iconBgOpacity,
  onIconBgEnabledChange,
  onIconBgColorChange,
  onIconBgPaddingChange,
  onIconBgRadiusChange,
  onIconBgBlurChange,
  onIconBgOpacityChange,
}: IconBackgroundSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>图标背景</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center justify-between cursor-pointer">
          <span>启用图标背景</span>
          <Checkbox checked={iconBgEnabled} onCheckedChange={(c) => onIconBgEnabledChange(!!c)} />
        </label>

        {iconBgEnabled && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label>背景颜色</Label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={iconBgColor}
                  onChange={(e) => onIconBgColorChange(e.target.value)}
                  className="w-20 h-6 text-xs rounded-lg border border-input bg-transparent px-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <input
                  type="color"
                  value={iconBgColor}
                  onChange={(e) => onIconBgColorChange(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>内边距: {iconBgPadding}px</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    value={iconBgPadding}
                    onChange={(e) => onIconBgPaddingChange(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="flex-1 h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>圆角: {iconBgRadius}%</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    value={iconBgRadius}
                    onChange={(e) => onIconBgRadiusChange(Number(e.target.value))}
                    min={0}
                    max={50}
                    className="flex-1 h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>模糊: {iconBgBlur}px</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    value={iconBgBlur}
                    onChange={(e) => onIconBgBlurChange(Number(e.target.value))}
                    min={0}
                    max={20}
                    className="flex-1 h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>不透明度: {Math.round(iconBgOpacity * 100)}%</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    value={iconBgOpacity}
                    onChange={(e) => onIconBgOpacityChange(Number(e.target.value))}
                    min={0}
                    max={1}
                    step={0.01}
                    className="flex-1 h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
