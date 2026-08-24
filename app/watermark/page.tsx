'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { track } from '@/lib/track';

export default function WatermarkPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imageLoadedRef = useRef<HTMLImageElement | null>(null);
  const [watermarkText, setWatermarkText] = useState('');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(30);
  const [position, setPosition] = useState('右下');
  const [mode, setMode] = useState('single');
  const [angle, setAngle] = useState(345);
  const [color, setColor] = useState('#ffffff');
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  const resetDefaults = useCallback(() => {
    setWatermarkText('');
    setFontSize(48);
    setOpacity(30);
    setPosition('右下');
    setMode('single');
    setAngle(345);
    setColor('#ffffff');
  }, []);

  const colorThrottleRef = useRef<number | null>(null);
  const handleColorChange = useCallback((value: string) => {
    if (colorThrottleRef.current != null) {
      clearTimeout(colorThrottleRef.current);
      colorThrottleRef.current = window.setTimeout(() => {
        colorThrottleRef.current = null;
        setColor(value);
      }, 15);
      return;
    }
    setColor(value);
    colorThrottleRef.current = window.setTimeout(() => {
      colorThrottleRef.current = null;
    }, 15);
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      imageLoadedRef.current = img;
    };
    img.src = URL.createObjectURL(file);
    setImageSrc(img.src);
    e.target.value = '';
  }, []);

  // Reactive canvas rendering
  useEffect(() => {
    const img = imageLoadedRef.current;
    const text = watermarkText.trim();
    if (!img || !text) {
      setProcessedUrl(null);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const fs = fontSize;
    const op = opacity;
    ctx.font = `bold ${fs}px sans-serif`;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    ctx.fillStyle = `rgba(${r},${g},${b},${op / 100})`;
    ctx.textBaseline = 'bottom';

    const textWidth = ctx.measureText(text).width;
    const padding = 20;

    if (mode === 'tile') {
      const spacingX = textWidth + 60;
      const spacingY = fs + 60;
      for (let y = padding; y < canvas.height; y += spacingY) {
        for (let x = padding; x < canvas.width; x += spacingX) {
          ctx.fillText(text, x, y);
        }
      }
    } else if (mode === 'tile-diagonal') {
      const spacingX = textWidth + 60;
      const spacingY = fs + 60;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((angle * Math.PI) / 180);
      const radius = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height) / 2;
      const startY = -radius;
      for (let y = startY; y <= radius; y += spacingY) {
        for (let x = -radius - textWidth; x <= radius; x += spacingX) {
          ctx.fillText(text, x, y);
        }
      }
      ctx.restore();
    } else {
      let x: number, y: number;
      switch (position) {
        case '左上':
          x = padding;
          y = fs + padding;
          break;
        case '右上':
          x = canvas.width - textWidth - padding;
          y = fs + padding;
          break;
        case '左下':
          x = padding;
          y = canvas.height - padding;
          break;
        default: // 右下
          x = canvas.width - textWidth - padding;
          y = canvas.height - padding;
      }
      ctx.fillText(text, x, y);
    }

    setProcessedUrl(canvas.toDataURL('image/png'));
  }, [imageSrc, watermarkText, fontSize, opacity, position, mode, angle, color]);

  const handleDownload = useCallback(() => {
    if (!processedUrl) return;
    const a = document.createElement('a');
    a.href = processedUrl;
    a.download = 'watermarked.png';
    a.click();
    track('使用工具', { 工具: '图片水印', 动作: '下载', 位置: position });
  }, [processedUrl, position]);

  return (
    <main className="w-full max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Icon icon="mdi:water" className="size-6 text-primary" />
        <h1 className="text-xl font-bold">图片水印</h1>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">选择图片</Label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFile}
                className="flex h-9 w-full items-center border border-input bg-background px-1.5 text-sm file:mr-3 file:px-3 file:py-1 file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:cursor-pointer"
              />
            </div>
            <Button variant="outline" size="icon-lg" onClick={resetDefaults}>
              <Icon icon="mdi:restore" className="size-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">水印文字</Label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="2x.nz"
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">类型</Label>
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center justify-between gap-1 w-full h-8 rounded-lg border border-input bg-transparent px-3 text-sm text-left select-none focus-visible:outline-none focus:outline-none">
                  {mode === 'single' ? '单个水印' : mode === 'tile' ? '全屏平铺' : '斜向全屏平铺'}
                  <Icon icon="mdi:chevron-down" className="size-4 text-muted-foreground shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full min-w-[140px]">
                  <DropdownMenuItem onClick={() => setMode('single')}>单个水印</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMode('tile')}>全屏平铺</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMode('tile-diagonal')}>斜向全屏平铺</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">字体大小 ({fontSize})</Label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  min={12}
                  max={200}
                  step={1}
                  className="flex-1 h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
              </div>
            </div>
            {mode === 'single' && (
              <div className="space-y-1.5">
                <Label className="text-xs">位置</Label>
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center justify-between gap-1 w-full h-8 rounded-lg border border-input bg-transparent px-3 text-sm text-left select-none focus-visible:outline-none focus:outline-none">
                      {position}
                      <Icon icon="mdi:chevron-down" className="size-4 text-muted-foreground shrink-0" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-full min-w-[100px]">
                      <DropdownMenuItem onClick={() => setPosition('左上')}>左上</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPosition('右上')}>右上</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPosition('左下')}>左下</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPosition('右下')}>右下</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
            {mode === 'tile-diagonal' && (
              <div className="space-y-1.5">
                <Label className="text-xs">斜角 ({angle}°)</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    value={angle}
                    onChange={(e) => setAngle(Number(e.target.value))}
                    min={0}
                    max={360}
                    step={1}
                    className="flex-1 h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">不透明度 ({opacity}%)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  min={5}
                  max={100}
                  step={1}
                  className="flex-1 h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">颜色</Label>
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-8 w-full cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {imageSrc && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <img
              src={processedUrl || imageSrc}
              alt="水印结果"
              className="w-full rounded-lg border"
            />
            {processedUrl && (
              <Button className="w-full" variant="default" onClick={handleDownload}>
                <Icon icon="mdi:download" className="size-4 mr-1" />
                下载图片
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
