/**
 * 用 Node 复算 lib/music/ncm.ts 的解密逻辑，对真实 .ncm 样本做端到端校验。
 * 只用于开发期验证，不参与打包。
 *
 * 用法: node scripts/verify-ncm.mjs <path-to.ncm>
 */
import { createDecipheriv, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';

const CORE_KEY = Buffer.from([
  0x68, 0x7a, 0x48, 0x52, 0x41, 0x6d, 0x73, 0x6f, 0x35, 0x6b, 0x49, 0x6e, 0x62, 0x61, 0x78, 0x57,
]);
const MODIFY_KEY = Buffer.from([
  0x23, 0x31, 0x34, 0x6c, 0x6a, 0x6b, 0x5f, 0x21, 0x5c, 0x5d, 0x26, 0x30, 0x55, 0x3c, 0x27, 0x28,
]);

function aesEcbDecrypt(key, src) {
  const out = Buffer.alloc(src.length);
  const blocks = src.length >> 4;
  for (let i = 0; i < blocks; i++) {
    const d = createDecipheriv('aes-128-ecb', key, null);
    d.setAutoPadding(false);
    const plain = Buffer.concat([d.update(src.subarray(i * 16, i * 16 + 16)), d.final()]);
    plain.copy(out, i * 16);
  }
  return out;
}

function buildKeyBox(key) {
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

function detectFormat(d) {
  if (d[0] === 0x66 && d[1] === 0x4c && d[2] === 0x61 && d[3] === 0x43) return 'flac';
  if (d[0] === 0x49 && d[1] === 0x44 && d[2] === 0x33) return 'mp3';
  if (d[0] === 0xff && (d[1] & 0xe0) === 0xe0) return 'mp3';
  if (d[4] === 0x66 && d[5] === 0x74 && d[6] === 0x79 && d[7] === 0x70) return 'm4a';
  if (d[0] === 0x4f && d[1] === 0x67 && d[2] === 0x67 && d[3] === 0x53) return 'ogg';
  return 'unknown';
}

const path = process.argv[2];
if (!path) {
  console.error('用法: node scripts/verify-ncm.mjs <path-to.ncm>');
  process.exit(1);
}

const buf = readFileSync(path);

if (buf.toString('latin1', 0, 8) !== 'CTENFDAM') {
  console.error('✗ 不是 .ncm 文件');
  process.exit(1);
}

let p = 10;
const keyLen = buf.readUInt32LE(p);
p += 4;
const keyData = Buffer.from(buf.subarray(p, p + keyLen));
p += keyLen;
for (let i = 0; i < keyData.length; i++) keyData[i] ^= 0x64;

const rawKey = aesEcbDecrypt(CORE_KEY, keyData);
const keyBox = buildKeyBox(rawKey.subarray(17));
console.log('✓ 核心密钥段解密成功, keyBox 长度', keyBox.length);

const metaLen = buf.readUInt32LE(p);
p += 4;
let meta = null;
if (metaLen > 0) {
  const metaData = Buffer.from(buf.subarray(p, p + metaLen));
  p += metaLen;
  for (let i = 0; i < metaData.length; i++) metaData[i] ^= 0x63;
  const b64 = metaData.toString('latin1', 22);
  try {
    const plain = aesEcbDecrypt(MODIFY_KEY, Buffer.from(b64, 'base64'));
    const json = plain.toString('latin1', 6);
    meta = JSON.parse(json);
    console.log('✓ 元信息:', JSON.stringify(meta).slice(0, 200));
  } catch (e) {
    console.log('! 元信息解析失败:', e.message);
  }
}

p += 5;
const coverFrameLen = buf.readUInt32LE(p);
p += 4;
const coverLen = buf.readUInt32LE(p);
p += 4;
if (coverLen > 0) {
  const c = buf.subarray(p, p + coverLen);
  const isPng = c[0] === 0x89 && c[1] === 0x50;
  const isJpg = c[0] === 0xff && c[1] === 0xd8;
  console.log('✓ 封面:', coverLen, '字节,', isPng ? 'PNG' : isJpg ? 'JPEG' : '未知');
}
p += Math.max(coverFrameLen - coverLen, 0);

const audio = Buffer.from(buf.subarray(p));
for (let i = 0; i < audio.length; i++) {
  const j = (i + 1) & 0xff;
  audio[i] ^= keyBox[(keyBox[j] + keyBox[(keyBox[j] + j) & 0xff]) & 0xff];
}

const fmt = detectFormat(audio);
console.log('✓ 音频段:', audio.length, '字节');
console.log('✓ 识别格式:', fmt);
console.log('前 16 字节:', audio.subarray(0, 16).toString('hex'));
if (meta?.musicName) console.log('✓ 歌名:', meta.musicName);
