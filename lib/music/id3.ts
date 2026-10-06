import type { Track } from './types';
import { decryptNcm, isNcmFile } from './ncm';

export interface LocalAudio {
  track: Track;
  file: File;
  objectUrl: string;
  hasTags: boolean;
  /** 原本是加密容器、已被解出可播音频 */
  decrypted?: boolean;
  /** 解密后的可导出文件名 */
  exportName?: string;
  coverUrl?: string;
}

const GENRE_FALLBACK = '';

/**
 * 从本地音频文件的 ID3 标签里读出元信息。
 *
 * 只做只读解析，不依赖任何第三方库。优先 ID3v2（v2.2/2.3/2.4 都覆盖），
 * 读不到再退 ID3v1（文件末尾 128 字节）。都没有就用文件名兜底 —— 保证拖进来的
 * 文件总能播，标签只是加分项。
 */
export async function parseLocalAudio(file: File): Promise<LocalAudio> {
  if (isNcmFile(file.name)) {
    return parseNcmAudio(file);
  }

  const objectUrl = URL.createObjectURL(file);
  const base: Track = {
    platform: 'netease',
    id: '',
    name: file.name.replace(/\.[^.]+$/, ''),
    artist: '',
    local: true,
  };

  let parsed: Partial<Track> | null = null;
  try {
    parsed = await readTags(file);
  } catch {
    parsed = null;
  }

  const track: Track = {
    ...base,
    ...(parsed ?? {}),
    name: parsed?.name || base.name,
  };

  return { track, file, objectUrl, hasTags: Boolean(parsed?.name || parsed?.artist) };
}

async function parseNcmAudio(file: File): Promise<LocalAudio> {
  const result = await decryptNcm(file);
  const objectUrl = URL.createObjectURL(result.audio);
  const coverUrl = result.cover ? URL.createObjectURL(result.cover) : undefined;

  const baseName = file.name.replace(/\.ncm$/i, '');
  const track: Track = {
    platform: 'netease',
    id: '',
    name: result.title || baseName,
    artist: result.artist || '',
    album: result.album,
    local: true,
  };

  try {
    const inner = new File([result.audio], `${baseName}.${result.format}`, {
      type: result.audio.type,
    });
    const tags = await readTags(inner);
    if (tags) {
      if (tags.name) track.name = tags.name;
      if (tags.artist) track.artist = tags.artist;
      if (tags.album) track.album = tags.album;
    }
  } catch {
    // 解密出的音频读不到标签不影响播放
  }

  return {
    track,
    file,
    objectUrl,
    hasTags: Boolean(track.name && track.artist),
    decrypted: true,
    exportName: `${track.artist ? `${track.artist} - ` : ''}${track.name}.${result.format}`,
    coverUrl,
  };
}

async function readTags(file: File): Promise<Partial<Track> | null> {
  const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
  if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
    return readId3v2(file, head);
  }
  return readId3v1(file);
}

async function readId3v2(file: File, head: Uint8Array): Promise<Partial<Track> | null> {
  const major = head[3];
  const flags = head[5];
  const size = readSynchsafe(head, 6, 4);

  let offset = 10;
  if (flags & 0x40) {
    const ext = new Uint8Array(await file.slice(10, 14).arrayBuffer());
    offset += readSynchsafe(ext, 0, 4) + 4;
  }

  const buf = new Uint8Array(await file.slice(offset, 10 + size).arrayBuffer());
  const frames = parseFrames(buf, major);

  const title = frames.TIT2 ?? frames.TT2;
  const artist = frames.TPE1 ?? frames.TP1;
  const album = frames.TALB ?? frames.TAL;
  const cover = frames.APIC ?? frames.PIC;

  if (!title && !artist && !album && !cover) return null;

  const result: Partial<Track> = {};
  if (title) result.name = title;
  if (artist) result.artist = artist;
  if (album) result.album = album;
  void GENRE_FALLBACK;

  if (cover) {
    result.cover = cover;
  }

  return result;
}

interface FrameValue {
  TIT2?: string;
  TPE1?: string;
  TALB?: string;
  APIC?: string;
  TT2?: string;
  TP1?: string;
  TAL?: string;
  PIC?: string;
}

function parseFrames(buf: Uint8Array, major: number): FrameValue {
  const out: FrameValue = {};
  const idLen = major === 2 ? 3 : 4;
  let p = 0;

  while (p + idLen + 4 <= buf.length) {
    const id = readAscii(buf, p, idLen);
    if (!/^[A-Z0-9]{3,4}$/.test(id)) break;
    p += idLen;

    let size: number;
    if (major === 2) {
      size = (buf[p] << 16) | (buf[p + 1] << 8) | buf[p + 2];
      p += 3;
    } else if (major === 4) {
      size = readSynchsafe(buf, p, 4);
      p += 4;
    } else {
      size = (buf[p] << 24) | (buf[p + 1] << 16) | (buf[p + 2] << 8) | buf[p + 3];
      p += 4;
    }
    if (major !== 2) p += 2;

    if (size <= 0 || p + size > buf.length) break;
    const body = buf.subarray(p, p + size);
    p += size;

    applyFrame(out, id, body, major);
  }

  return out;
}

function applyFrame(out: FrameValue, id: string, body: Uint8Array, major: number): void {
  const textKeys = ['TIT2', 'TPE1', 'TALB', 'TT2', 'TP1', 'TAL'];
  if (textKeys.includes(id)) {
    const text = decodeText(body);
    if (id === 'TIT2' || id === 'TT2') out.TIT2 = text;
    else if (id === 'TPE1' || id === 'TP1') out.TPE1 = text;
    else out.TALB = text;
    return;
  }

  if (id === 'APIC' || id === 'PIC') {
    const cover = decodePicture(body, major === 2);
    if (cover) out.APIC = cover;
  }
}

function decodeText(body: Uint8Array): string {
  if (body.length < 2) return '';
  const enc = body[0];
  const bytes = body.subarray(1);
  if (enc === 0) return latin1(bytes);
  if (enc === 1) return utf16(bytes, true);
  if (enc === 2) return utf16(bytes, false);
  return new TextDecoder('utf-8').decode(bytes);
}

function decodePicture(body: Uint8Array, v22: boolean): string | null {
  if (body.length < 4) return null;
  const enc = body[0];
  const mimeEnd = findZero(body, 1, enc === 1 || enc === 2);
  const mime = v22 ? 'image/jpeg' : latin1(body.subarray(1, mimeEnd));
  let p = mimeEnd + (enc === 1 || enc === 2 ? 2 : 1);
  p += 1;
  p = findZero(body, p, enc === 1 || enc === 2) + (enc === 1 || enc === 2 ? 2 : 1);

  const data = body.subarray(p);
  if (!data.length) return null;
  const blob = new Blob([data as BlobPart], { type: mime || 'image/jpeg' });
  return URL.createObjectURL(blob);
}

async function readId3v1(file: File): Promise<Partial<Track> | null> {
  if (file.size < 128) return null;
  const buf = new Uint8Array(await file.slice(file.size - 128).arrayBuffer());
  if (readAscii(buf, 0, 3) !== 'TAG') return null;
  return {
    name: latin1(buf.subarray(3, 33)),
    artist: latin1(buf.subarray(33, 63)),
    album: latin1(buf.subarray(63, 93)),
  };
}

function readSynchsafe(buf: Uint8Array, offset: number, len: number): number {
  let n = 0;
  for (let i = 0; i < len; i++) n = (n << 7) | (buf[offset + i] & 0x7f);
  return n;
}

function readAscii(buf: Uint8Array, offset: number, len: number): string {
  return latin1(buf.subarray(offset, offset + len));
}

function latin1(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) if (b) s += String.fromCharCode(b);
  return s.trim();
}

function utf16(bytes: Uint8Array, le: boolean): string {
  return new TextDecoder(le ? 'utf-16le' : 'utf-16be').decode(bytes).replace(/\0+$/, '').trim();
}

function findZero(buf: Uint8Array, from: number, wide: boolean): number {
  const step = wide ? 2 : 1;
  for (let i = from; i < buf.length - step + 1; i += step) {
    if (buf[i] === 0 && (!wide || buf[i + 1] === 0)) return i;
  }
  return buf.length;
}
