'use client';

import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { ShadowConfig } from './types';

interface ShadowSettingsProps {
  shadowTarget: 'both' | 'text' | 'icon';
  textShadow: ShadowConfig;
  iconShadow: ShadowConfig;
  onShadowTargetChange: (v: 'both' | 'text' | 'icon') => void;
  onUpdateShadow: (key: string, value: string | number) => void;
}

export function ShadowSettings({
  shadowTarget,
  textShadow,
  iconShadow,
  onShadowTargetChange,
  onUpdateShadow,
}: ShadowSettingsProps) {
  const currentShadow = shadowTarget === 'icon' ? iconShadow : textShadow;

  const targets = [
    { id: 'both' as const, icon: 'mdi:layers', label: '全部' },
    { id: 'text' as const, icon: 'mdi:format-text', label: '文字' },
    { id: 'icon' as const, icon: 'mdi:star', label: '图标' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>阴影设置</span>
          <div className="flex gap-1 border rounded-lg p-1">
            {targets.map((target) => (
              <Button
                key={target.id}
                variant={shadowTarget === target.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onShadowTargetChange(target.id)}
                title={target.label}
              >
                <Icon icon={target.icon} className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>颜色</Label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={currentShadow.color}
              onChange={(e) => onUpdateShadow('color', e.target.value)}
              className="w-24 h-8 text-xs rounded-lg border border-input bg-transparent px-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <input
              type="color"
              value={currentShadow.color}
              onChange={(e) => onUpdateShadow('color', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-2">
            <Label className="text-xs">模糊</Label>
            <input
              type="number"
              value={currentShadow.blur}
              onChange={(e) => onUpdateShadow('blur', Number(e.target.value))}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">水平</Label>
            <input
              type="number"
              value={currentShadow.x}
              onChange={(e) => onUpdateShadow('x', Number(e.target.value))}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">垂直</Label>
            <input
              type="number"
              value={currentShadow.y}
              onChange={(e) => onUpdateShadow('y', Number(e.target.value))}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>不透明度: {Math.round(currentShadow.alpha * 100)}%</Label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-6">0%</span>
            <input
              type="range"
              value={currentShadow.alpha}
              onChange={(e) => onUpdateShadow('alpha', Number(e.target.value))}
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
