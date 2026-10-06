import type { ParsedLink, Platform, TrackKind } from './types';

const NETEASE_HOSTS = ['music.163.com', 'y.music.163.com', '163cn.tv'];

interface Rule {
  platform: Platform;
  kind: TrackKind;
  re: RegExp;
}

const RULES: Rule[] = [
  { platform: 'netease', kind: 'playlist', re: /music\.163\.com\/(?:#\/)?(?:m\/)?playlist\?[^\s]*?\bid=(\d+)/i },
  { platform: 'netease', kind: 'song', re: /music\.163\.com\/(?:#\/)?(?:m\/)?song\?[^\s]*?\bid=(\d+)/i },
  { platform: 'kugou', kind: 'song', re: /kugou\.com\/song\/#?hash=([0-9a-f]{32})/i },
  { platform: 'kugou', kind: 'song', re: /kugou\.com\/(?:mixsong|song)\/([0-9a-z]+)\.html/i },
];

/**
 * 从任意文本里解析出平台与 ID。
 *
 * 输入通常是用户整段粘贴的分享文案（含歌名、歌手、平台名等噪声），所以不要求
 * 输入是个完整 URL，只在文本里找匹配的链接片段。识别不了返回 null，不抛异常。
 */
export function parseLink(text: string): ParsedLink | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  for (const rule of RULES) {
    const m = rule.re.exec(trimmed);
    if (m?.[1]) {
      return { platform: rule.platform, id: m[1], kind: rule.kind };
    }
  }

  const bare = extractBareId(trimmed);
  if (bare) return bare;

  return null;
}

/** 用户只贴了一串纯 ID / hash（没有 URL）时的兜底 */
function extractBareId(text: string): ParsedLink | null {
  if (/^\d{5,}$/.test(text)) {
    return { platform: 'netease', id: text, kind: 'song' };
  }
  if (/^[0-9a-f]{32}$/i.test(text)) {
    return { platform: 'kugou', id: text.toLowerCase(), kind: 'song' };
  }
  return null;
}

export function isNetEaseHost(url: string): boolean {
  try {
    return NETEASE_HOSTS.some((h) => new URL(url).hostname.endsWith(h));
  } catch {
    return false;
  }
}
