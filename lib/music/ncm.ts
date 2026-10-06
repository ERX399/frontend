/**
 * 网易云 .ncm 容器解析。
 *
 * 文件结构（全部小端）：
 *   8 字节  magic "CTENFDAM"
 *   2 字节  版本
 *   4 字节  keyData 长度 n
 *   n 字节  核心密钥密文（每个字节先 XOR 0x64，再 AES-128-ECB 解密）
 *   4 字节  meta 长度 m
 *   m 字节  元信息（每个字节先 XOR 0x63，base64 解出后再 AES-128-ECB 解密）
 *   5 字节  crc32 + 图片版本
 *   4 字节  封面帧长度
 *   4 字节  封面数据长度 k，后跟 k 字节封面
 *   剩余    音频流（按 keyBox 逐字节异或还原）
 *
 * 只用浏览器原生 Web Crypto 的 AES-CBC 模拟 ECB 拆块，不引入任何第三方库。
 */

const MAGIC = 'CTENFDAM';
const CORE_KEY = new Uint8Array([
  0x68, 0x7a, 0x48, 0x52, 0x41, 0x6d, 0x73, 0x6f, 0x35, 0x6b, 0x49, 0x6e, 0x62, 0x61, 0x78, 0x57,
]);
const MODIFY_KEY = new Uint8Array([
  0x23, 0x31, 0x34, 0x6c, 0x6a, 0x6b, 0x5f, 0x21, 0x5c, 0x5d, 0x26, 0x30, 0x55, 0x3c, 0x27, 0x28,
]);

export interface NcmResult {
  audio: Blob;
  format: string;
  title?: string;
  artist?: string;
  album?: string;
  cover?: Blob;
}

export class NcmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NcmError';
  }
}

export function isNcmFile(name: string): boolean {
  return name.toLowerCase().endsWith('.ncm');
}

export async function decryptNcm(file: File): Promise<NcmResult> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  if (latin1(buf, 0, 8) !== MAGIC) {
    throw new NcmError('不是有效的 .ncm 文件');
  }

  let p = 10;
  const keyLen = view.getUint32(p, true);
  p += 4;
  if (keyLen <= 0 || p + keyLen > buf.length) throw new NcmError('密钥段损坏');

  const keyData = buf.subarray(p, p + keyLen).slice();
  p += keyLen;
  for (let i = 0; i < keyData.length; i++) keyData[i] ^= 0x64;

  const rawKey = await aesEcbDecrypt(CORE_KEY, keyData);
  const keyBox = buildKeyBox(rawKey.subarray(17));

  const metaLen = view.getUint32(p, true);
  p += 4;
  let meta: NcmResult = { audio: new Blob(), format: 'mp3' };

  if (metaLen > 0 && p + metaLen <= buf.length) {
    const metaData = buf.subarray(p, p + metaLen).slice();
    p += metaLen;
    for (let i = 0; i < metaData.length; i++) metaData[i] ^= 0x63;
    meta = await parseMeta(metaData);
  }

  p += 5;
  if (p + 4 > buf.length) throw new NcmError('封面段损坏');
  const coverFrameLen = view.getUint32(p, true);
  p += 4;
  if (p + 4 > buf.length) throw new NcmError('封面段损坏');
  const coverLen = view.getUint32(p, true);
  p += 4;

  let cover: Blob | undefined;
  if (coverLen > 0 && p + coverLen <= buf.length) {
    cover = new Blob([buf.subarray(p, p + coverLen) as BlobPart]);
  }
  // 封面帧总长 coverFrameLen，其中前 coverLen 字节是图，剩下的是帧内其它数据，
  // 音频从 coverFrameLen 的末尾开始 —— 所以这里只能再前进 coverFrameLen - coverLen。
  p += Math.max(coverFrameLen - coverLen, 0);

  const audioData = buf.subarray(p).slice();
  for (let i = 0; i < audioData.length; i++) {
    const j = (i + 1) & 0xff;
    audioData[i] ^= keyBox[(keyBox[j] + keyBox[(keyBox[j] + j) & 0xff]) & 0xff];
  }

  const format = detectFormat(audioData);
  return {
    ...meta,
    audio: new Blob([audioData as BlobPart], { type: mimeOf(format) }),
    format,
    cover,
  };
}

async function parseMeta(metaData: Uint8Array): Promise<NcmResult> {
  const b64 = latin1(metaData, 22, metaData.length);
  let decoded: Uint8Array;
  try {
    decoded = b64ToBytes(b64);
  } catch {
    return { audio: new Blob(), format: 'mp3' };
  }
  const plain = await aesEcbDecrypt(MODIFY_KEY, decoded);
  const json = latin1(plain, 6, plain.length);
  try {
    const data = JSON.parse(json) as {
      musicName?: string;
      artist?: Array<[string, number]> | string[][];
      album?: string;
    };
    const artist = Array.isArray(data.artist)
      ? data.artist.map((a) => (Array.isArray(a) ? a[0] : a)).join(' / ')
      : undefined;
    return {
      audio: new Blob(),
      format: 'mp3',
      title: data.musicName,
      artist,
      album: data.album,
    };
  } catch {
    return { audio: new Blob(), format: 'mp3' };
  }
}

function buildKeyBox(key: Uint8Array): Uint8Array {
  const box = new Uint8Array(256);
  for (let i = 0; i < 256; i++) box[i] = i;

  let last = 0;
  let offset = 0;
  for (let i = 0; i < 256; i++) {
    const swap = box[i];
    const c = (swap + last + key[offset++]) & 0xff;
    if (offset >= key.length) offset = 0;
    box[i] = box[c];
    box[c] = swap;
    last = c;
  }
  return box;
}

/** Web Crypto 没有裸 ECB，用 AES-CBC 逐块解并取每块的前 16 字节 */
async function aesEcbDecrypt(key: Uint8Array, src: Uint8Array): Promise<Uint8Array> {
  const blocks = src.length >> 4;
  const out = new Uint8Array(blocks * 16);
  if (!blocks) return out;

  const cryptoKey = await crypto.subtle.importKey('raw', key as BufferSource, 'AES-CBC', false, [
    'decrypt',
  ]);
  const zeroIv = new Uint8Array(16);

  for (let i = 0; i < blocks; i++) {
    const block = src.subarray(i * 16, i * 16 + 16);
    const plain = new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-CBC', iv: zeroIv }, cryptoKey, block as BufferSource),
    );
    out.set(plain, i * 16);
  }
  return out;
}

function detectFormat(data: Uint8Array): string {
  if (data[0] === 0x66 && data[1] === 0x4c && data[2] === 0x61 && data[3] === 0x43) return 'flac';
  if (data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) return 'mp3';
  if (data[0] === 0xff && (data[1] & 0xe0) === 0xe0) return 'mp3';
  if (data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70) return 'm4a';
  if (data[0] === 0x4f && data[1] === 0x67 && data[2] === 0x67 && data[3] === 0x53) return 'ogg';
  return 'mp3';
}

function mimeOf(format: string): string {
  const map: Record<string, string> = {
    flac: 'audio/flac',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
  };
  return map[format] ?? 'audio/mpeg';
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function latin1(buf: Uint8Array, from: number, to: number): string {
  let s = '';
  for (let i = from; i < to; i++) s += String.fromCharCode(buf[i]);
  return s;
}
