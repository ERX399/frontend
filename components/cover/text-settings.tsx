'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

interface TextSettingsProps {
  leftText: string;
  rightText: string;
  fontWeight: number;
  customFontName: string;
  onLeftTextChange: (v: string) => void;
  onRightTextChange: (v: string) => void;
  onFontWeightChange: (v: number) => void;
  onFontUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSystemFontSelect: (fontName: string) => void;
  onRemoveFont: () => void;
}

export function TextSettings({
  leftText,
  rightText,
  fontWeight,
  customFontName,
  onLeftTextChange,
  onRightTextChange,
  onFontWeightChange,
  onFontUpload,
  onSystemFontSelect,
  onRemoveFont,
}: TextSettingsProps) {
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [fontSearchQuery, setFontSearchQuery] = useState('');
  const [isLoadingFonts, setIsLoadingFonts] = useState(false);
  const [fontApiSupported, setFontApiSupported] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const FONTS_PER_PAGE = 20;

  // Reset page on search
  useEffect(() => {
    setCurrentPage(1);
  }, [fontSearchQuery]);

  const filteredFonts = systemFonts.filter((font) =>
    font.toLowerCase().includes(fontSearchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredFonts.length / FONTS_PER_PAGE);
  const paginatedFonts = filteredFonts.slice(
    (currentPage - 1) * FONTS_PER_PAGE,
    currentPage * FONTS_PER_PAGE
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && 'queryLocalFonts' in window) {
      setFontApiSupported(true);
    }
  }, []);

  const loadSystemFonts = useCallback(async () => {
    if (!('queryLocalFonts' in window)) return;

    setIsLoadingFonts(true);
    try {
      const status = await (navigator.permissions as any).query({ name: 'local-fonts' });
      if (status.state === 'denied') return;

      const fonts = await (window as any).queryLocalFonts();
      const fontNames = new Set<string>();
      fonts.forEach((font: any) => fontNames.add(font.family));
      setSystemFonts(Array.from(fontNames).sort());
    } catch (error) {
      console.error('Failed to load system fonts:', error);
    } finally {
      setIsLoadingFonts(false);
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>文本设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="left-text">左侧文字</Label>
          <input
            id="left-text"
            type="text"
            value={leftText}
            onChange={(e) => onLeftTextChange(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="right-text">右侧文字</Label>
          <input
            id="right-text"
            type="text"
            value={rightText}
            onChange={(e) => onRightTextChange(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <Label>字体粗细: {fontWeight}</Label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-8">100</span>
            <input
              type="range"
              value={fontWeight}
              onChange={(e) => onFontWeightChange(Number(e.target.value))}
              min={100}
              max={900}
              step={100}
              className="flex-1 h-2 appearance-none rounded-full bg-muted accent-primary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            />
            <span className="text-xs text-muted-foreground w-8 text-right">900</span>
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <Label>自定义字体</Label>
          <div>
            <input
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              onChange={onFontUpload}
              className="hidden"
              id="font-upload"
            />
            <Label
              htmlFor="font-upload"
              className="flex items-center justify-center w-full h-16 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary"
            >
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Icon icon="mdi:font-download" className="h-5 w-5" />
                <span className="text-xs">{customFontName || '点击上传字体'}</span>
              </div>
            </Label>
            {customFontName && (
              <Button variant="outline" size="sm" className="mt-2" onClick={onRemoveFont}>
                移除字体
              </Button>
            )}
          </div>

          {fontApiSupported && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>系统字体</Label>
                {systemFonts.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadSystemFonts}
                    disabled={isLoadingFonts}
                  >
                    {isLoadingFonts ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" />
                        加载中...
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:folder-open" className="mr-2 h-4 w-4" />
                        获取系统字体
                      </>
                    )}
                  </Button>
                )}
              </div>

              {systemFonts.length > 0 && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={fontSearchQuery}
                    onChange={(e) => setFontSearchQuery(e.target.value)}
                    placeholder="搜索字体..."
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />

                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    <div className="divide-y">
                      {paginatedFonts.map((font) => (
                        <button
                          key={font}
                          onClick={() => onSystemFontSelect(font)}
                          className={`w-full px-3 py-2 text-left hover:bg-foreground hover:text-background transition-colors ${
                            customFontName === font ? 'bg-primary text-primary-foreground font-medium' : ''
                          }`}
                          style={{ fontFamily: `'${font}', sans-serif` }}
                        >
                          {font}
                        </button>
                      ))}
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        第 {currentPage} / {totalPages} 页，共 {filteredFonts.length} 个字体
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                        >
                          <Icon icon="mdi:chevron-double-left" className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <Icon icon="mdi:chevron-left" className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <Icon icon="mdi:chevron-right" className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                        >
                          <Icon icon="mdi:chevron-double-right" className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!fontApiSupported && (
            <p className="text-xs text-muted-foreground">您的浏览器不支持本地字体访问 API</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
