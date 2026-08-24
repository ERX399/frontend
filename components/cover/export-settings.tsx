'use client';

import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Ratio, ExportConfig } from './types';

interface ExportSettingsProps {
  ratios: Ratio[];
  exportConfig: ExportConfig;
  canvasWidth: number;
  canvasHeight: number;
  activeRatios: Ratio[];
  onRatiosChange: (ratios: Ratio[]) => void;
  onExportConfigChange: (cfg: ExportConfig) => void;
  onExport: () => void;
}

export function ExportSettings({
  ratios,
  exportConfig,
  canvasWidth,
  canvasHeight,
  activeRatios,
  onRatiosChange,
  onExportConfigChange,
  onExport,
}: ExportSettingsProps) {
  const selectRatio = (label: string) => {
    onRatiosChange(ratios.map((r) => ({ ...r, checked: r.label === label })));
  };

  const selectScale = (scale: number) => {
    onExportConfigChange({ ...exportConfig, scales: [scale] });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>画板比例</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {ratios.map((ratio) => (
              <button
                key={ratio.label}
                type="button"
                onClick={() => selectRatio(ratio.label)}
                className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                  ratio.checked
                    ? 'border-border bg-card'
                    : 'border-input hover:bg-foreground hover:text-background'
                }`}
              >
                <span
                  className={`relative flex size-4 shrink-0 items-center justify-center border ${
                    ratio.checked
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background'
                  }`}
                >
                  {ratio.checked && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-3 block" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                  )}
                </span>
                <span className="font-mono">{ratio.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {exportConfig.format === 'png' && (
        <Card>
          <CardHeader>
            <CardTitle>缩放倍率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => selectScale(scale)}
                  className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                    exportConfig.scales[0] === scale
                      ? 'border-border bg-card'
                      : 'border-input hover:bg-foreground hover:text-background'
                  }`}
                >
                  <span
                    className={`relative flex size-4 shrink-0 items-center justify-center border ${
                      exportConfig.scales[0] === scale
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background'
                    }`}
                  >
                    {exportConfig.scales[0] === scale && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-3 block" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                    )}
                  </span>
                  <span className="font-mono">{scale}x</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round(canvasWidth)}x{Math.round(canvasHeight)} px
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>导出设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>文件名</Label>
            <input
              type="text"
              value={exportConfig.filename}
              onChange={(e) => onExportConfigChange({ ...exportConfig, filename: e.target.value })}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label>格式</Label>
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => onExportConfigChange({ ...exportConfig, format: 'png' })}
                className={`flex-1 py-2 text-sm font-bold transition-colors ${
                  exportConfig.format === 'png'
                    ? 'bg-primary text-primary-foreground hover:bg-foreground hover:text-background'
                    : 'bg-background text-muted-foreground hover:bg-foreground hover:text-background'
                }`}
              >
                PNG
              </button>
              <button
                onClick={() => onExportConfigChange({ ...exportConfig, format: 'svg' })}
                className={`flex-1 py-2 text-sm font-bold transition-colors ${
                  exportConfig.format === 'svg'
                    ? 'bg-primary text-primary-foreground hover:bg-foreground hover:text-background'
                    : 'bg-background text-muted-foreground hover:bg-foreground hover:text-background'
                }`}
              >
                SVG
              </button>
            </div>
          </div>

          <label className="flex items-center justify-between p-2 border rounded cursor-pointer">
            <span>背景透明</span>
            <Checkbox
              checked={exportConfig.transparentBg}
              onCheckedChange={(c) =>
                onExportConfigChange({ ...exportConfig, transparentBg: !!c })
              }
            />
          </label>

          <Button
            onClick={onExport}
            disabled={activeRatios.length === 0}
            className="w-full"
            size="lg"
          >
            <Icon icon="mdi:download" className="mr-2 h-5 w-5" />
            导出图片
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
