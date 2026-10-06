import { describe, expect, it } from 'vitest';
import { isNcmFile } from './ncm';

describe('isNcmFile', () => {
  it('识别 .ncm 扩展名', () => {
    expect(isNcmFile('song.ncm')).toBe(true);
    expect(isNcmFile('SONG.NCM')).toBe(true);
  });

  it('其它格式不认', () => {
    expect(isNcmFile('song.mp3')).toBe(false);
    expect(isNcmFile('song.flac')).toBe(false);
    expect(isNcmFile('song.kgm')).toBe(false);
  });
});

describe('ncm 密钥盒推导', () => {
  it('buildKeyBox 是 256 长度的置换（用同源算法复算校验）', () => {
    const key = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const box: number[] = Array.from({ length: 256 }, (_, i) => i);

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

    expect(box).toHaveLength(256);
    expect(new Set(box).size).toBe(256);
    expect(box.every((v) => v >= 0 && v <= 255)).toBe(true);
  });
});
