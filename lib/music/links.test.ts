import { describe, expect, it } from 'vitest';
import { parseLink } from './links';

describe('parseLink', () => {
  it('解析网易云单曲链接', () => {
    expect(parseLink('https://music.163.com/song?id=5257138')).toEqual({
      platform: 'netease',
      id: '5257138',
      kind: 'song',
    });
  });

  it('解析网易云 hash 路由链接', () => {
    expect(parseLink('https://music.163.com/#/song?id=5257138')?.id).toBe('5257138');
  });

  it('解析网易云移动端链接', () => {
    expect(parseLink('https://y.music.163.com/m/song?id=5257138')?.id).toBe('5257138');
  });

  it('解析网易云歌单链接', () => {
    expect(parseLink('https://music.163.com/playlist?id=2619366284')).toEqual({
      platform: 'netease',
      id: '2619366284',
      kind: 'playlist',
    });
  });

  it('从整段分享文案里抠出链接', () => {
    const text = '分享周杰伦的单曲《屋顶》: https://music.163.com/song?id=5257138 (来自@网易云音乐)';
    expect(parseLink(text)?.id).toBe('5257138');
  });

  it('解析酷狗 hash 链接', () => {
    const hash = 'F3D186764676A1C1D16A9A83AC453730';
    expect(parseLink(`https://www.kugou.com/song/#hash=${hash}`)).toEqual({
      platform: 'kugou',
      id: hash,
      kind: 'song',
    });
  });

  it('纯网易云数字 ID 兜底', () => {
    expect(parseLink('5257138')).toEqual({ platform: 'netease', id: '5257138', kind: 'song' });
  });

  it('纯酷狗 32 位 hash 兜底', () => {
    const hash = 'f3d186764676a1c1d16a9a83ac453730';
    expect(parseLink(hash)).toEqual({ platform: 'kugou', id: hash, kind: 'song' });
  });

  it('无效文本返回 null', () => {
    expect(parseLink('随便一段话没有链接')).toBeNull();
    expect(parseLink('')).toBeNull();
    expect(parseLink('   ')).toBeNull();
  });

  it('无关站点链接返回 null', () => {
    expect(parseLink('https://www.bilibili.com/video/BV1xx')).toBeNull();
  });
});
