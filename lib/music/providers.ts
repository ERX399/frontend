import type { Platform, Provider } from './types';

export const PROVIDERS: Record<Platform, Provider[]> = {
  netease: [
    { name: 'i-meto', label: 'i-meto', base: 'https://api.i-meto.com/meting/api' },
  ],
  kugou: [
    { name: 'i-meto', label: 'i-meto', base: 'https://api.i-meto.com/meting/api' },
  ],
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  netease: '网易云',
  kugou: '酷狗',
};

/** 平台短标签：现用图标集里没有网易云 / 酷狗的品牌图标，用文字标识代替 */
export const PLATFORM_BADGES: Record<Platform, string> = {
  netease: '163',
  kugou: 'KG',
};

export const PLATFORMS: Platform[] = ['netease', 'kugou'];
