'use client';

import { Icon } from '@/components/ui/icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface IconSettingsProps {
  showIcon: boolean;
  localIcon: string | null;
  searchQuery: string;
  searchResults: string[];
  iconName: string;
  onShowIconChange: (v: boolean) => void;
  onLocalIconUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectIcon: (icon: string) => void;
}

export function IconSettings({
  showIcon,
  localIcon,
  searchQuery,
  searchResults,
  iconName,
  onShowIconChange,
  onLocalIconUpload,
  onSearchInput,
  onSelectIcon,
}: IconSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>图标设置</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={showIcon} onCheckedChange={(c) => onShowIconChange(!!c)} />
            <span className="text-sm font-normal">显示图标</span>
          </label>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={onLocalIconUpload}
              className="hidden"
              id="icon-upload"
            />
            <Label
              htmlFor="icon-upload"
              className="flex items-center justify-center h-10 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary"
            >
              <Icon icon="mdi:image" className="mr-2 h-4 w-4" />
              <span className="text-xs">{localIcon ? '更换图片' : '上传图标'}</span>
            </Label>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={onSearchInput}
            placeholder="搜索图标库..."
            className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(48px, 1fr))' }}
            >
              {searchResults.map((icon) => (
                <button
                  key={icon}
                  onClick={() => onSelectIcon(icon)}
                  className={`aspect-square flex items-center justify-center p-1.5 rounded-md border hover:bg-foreground hover:text-background transition-colors ${
                    icon === iconName ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                  }`}
                  title={icon}
                >
                  <img
                    src={`https://api.iconify.design/${icon.split(':')[0]}/${icon.split(':')[1]}.svg`}
                    className="w-full h-full"
                    alt={icon}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">当前: {iconName}</div>
      </CardContent>
    </Card>
  );
}
