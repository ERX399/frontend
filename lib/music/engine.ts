import { PROVIDERS } from './providers';
import type { Platform, Provider, ResolvedTrack, Track } from './types';

interface MetingRaw {
  title?: string;
  name?: string;
  author?: string;
  artist?: string;
  url?: string;
  pic?: string;
  lrc?: string;
  id?: string;
}

export class MusicError extends Error {
  platform: Platform;
  detail?: string;

  constructor(message: string, platform: Platform, detail?: string) {
    super(message);
    this.name = 'MusicError';
    this.platform = platform;
    this.detail = detail;
  }
}

export function buildUrl(provider: Provider, params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return `${provider.base}?${qs}`;
}

/**
 * Meting 的直链形如 `...&type=url&id=xxx&auth=yyy`，从中抠出 id。
 *
 * 服务端在渠道失效时会吐字面量字符串 `"undefined"`（酷狗 song 端点现状），
 * 必须在源头挡掉，否则它会一路混进结果列表再拼成一条播不出来的地址。
 */
export function extractId(url?: string): string {
  if (!url) return '';
  try {
    const id = new URL(url).searchParams.get('id') ?? '';
    if (!id || id === 'undefined' || id === 'null') return '';
    return id;
  } catch {
    return '';
  }
}

/** 判断一条地址是不是可播的音频直链，用来挡掉渠道失效时返回的脏 url */
export function isPlayableUrl(url?: string): boolean {
  if (!url) return false;
  const id = new URL(url).searchParams.get('id');
  return Boolean(id) && id !== 'undefined' && id !== 'null';
}

/** 从 Meting 直链里抠出 auth 签名 */
export function extractAuth(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).searchParams.get('auth') ?? undefined;
  } catch {
    return undefined;
  }
}

async function callProvider(
  provider: Provider,
  server: Platform,
  type: string,
  id: string,
  auth?: string,
): Promise<MetingRaw[]> {
  const params: Record<string, string> = { server, type, id };
  if (auth) params.auth = auth;

  const res = await fetch(buildUrl(provider, params), {
    headers: { Accept: 'application/json, text/plain, */*' },
  });
  if (!res.ok) {
    throw new MusicError(`接口返回 ${res.status}`, server, `${provider.name} / ${type}`);
  }

  const text = await res.text();
  if (text.includes('鉴权失败') || text.includes('非法调用')) {
    throw new MusicError('签名已失效', server, provider.name);
  }

  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [data];
  } catch {
    throw new MusicError('接口返回不是合法 JSON', server, provider.name);
  }
}

function toTrack(raw: MetingRaw, platform: Platform, id: string): Track {
  return {
    platform,
    id,
    name: raw.title ?? raw.name ?? '未知曲目',
    artist: raw.author ?? raw.artist ?? '未知歌手',
    cover: raw.pic,
    lrc: raw.lrc,
  };
}

/** 关键词搜索，逐实例回退，全挂则抛错 */
export async function search(platform: Platform, keyword: string): Promise<Track[]> {
  let lastErr: unknown;
  for (const provider of PROVIDERS[platform]) {
    try {
      const rows = await callProvider(provider, platform, 'search', keyword);
      const tracks = rows
        .filter((r) => isPlayableUrl(r.url))
        .map((r) => toTrack(r, platform, extractId(r.url)));
      if (tracks.length) return tracks;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new MusicError(`${platformLabel(platform)}搜索失败，接口可能已失效`, platform, errText(lastErr));
}

/** 取单曲详情（含封面 / 歌词地址） */
export async function detail(platform: Platform, id: string): Promise<Track | null> {
  for (const provider of PROVIDERS[platform]) {
    try {
      const rows = await callProvider(provider, platform, 'song', id);
      const row = rows.find((r) => (r.title || r.name) && isPlayableUrl(r.url));
      if (row) return toTrack(row, platform, extractId(row.url) || id);
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * 取可播放地址与完整元信息。
 *
 * Meting 的 `song` 端点一次返回四个字段，各自是不可互换的独立地址：
 *   - `url` → `type=url`，302 跳向真实 CDN，**这才是播放地址**
 *   - `pic` → `type=pic`，封面图
 *   - `lrc` → `type=lrc`，歌词纯文本
 * 三者的 `auth` 签名都是短时效、必须原样带回。`<audio src="url">` 会自己跟随 302。
 */
export async function resolve(platform: Platform, id: string): Promise<ResolvedTrack> {
  let lastErr: unknown;
  for (const provider of PROVIDERS[platform]) {
    try {
      const rows = await callProvider(provider, platform, 'song', id);
      const row = rows.find((r) => isPlayableUrl(r.url));
      if (row?.url) {
        const track = toTrack(row, platform, extractId(row.url) || id);
        return {
          ...track,
          cover: row.pic,
          lrc: row.lrc,
          sourceUrl: row.url,
          playUrl: row.url,
          fresh: true,
        };
      }
    } catch (e) {
      lastErr = e;
    }
  }

  throw new MusicError(
    `${platformLabel(platform)}取流失败，接口可能已失效`,
    platform,
    errText(lastErr),
  );
}

export async function fetchLyric(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new MusicError(`歌词接口返回 ${res.status}`, 'netease');
  return res.text();
}

function platformLabel(platform: Platform): string {
  return platform === 'netease' ? '网易云' : '酷狗';
}

function errText(e: unknown): string | undefined {
  return e instanceof Error ? e.message : undefined;
}
