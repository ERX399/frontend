import { describe, expect, it } from 'vitest';
import { buildUrl, extractAuth, extractId, isPlayableUrl } from './engine';

const PROVIDER = { name: 't', label: 't', base: 'https://api.example.com/meting/api' };

describe('buildUrl', () => {
  it('按参数拼出查询串', () => {
    const url = buildUrl(PROVIDER, { server: 'netease', type: 'url', id: '123' });
    expect(url).toBe('https://api.example.com/meting/api?server=netease&type=url&id=123');
  });

  it('auth 原样保留，不被编码破坏', () => {
    const url = buildUrl(PROVIDER, { server: 'netease', type: 'url', id: '1', auth: 'abc123' });
    expect(url).toContain('auth=abc123');
  });
});

describe('extractId', () => {
  it('从 Meting 直链里抠出 id', () => {
    const u = 'https://api.i-meto.com/meting/api?server=netease&type=url&id=5257138&auth=xx';
    expect(extractId(u)).toBe('5257138');
  });

  it('酷狗 hash 形态的 id', () => {
    const u = 'https://api.i-meto.com/meting/api?server=kugou&type=url&id=b3a52a7a958bf0aed0ebfba2e9a818b7';
    expect(extractId(u)).toBe('b3a52a7a958bf0aed0ebfba2e9a818b7');
  });

  it('拒绝字面量 "undefined" 脏值', () => {
    const u = 'https://api.i-meto.com/meting/api?server=kugou&type=url&id=undefined&auth=xx';
    expect(extractId(u)).toBe('');
  });

  it('拒绝字面量 "null" 脏值', () => {
    expect(extractId('https://x/y?id=null')).toBe('');
  });

  it('无 id 参数返回空串', () => {
    expect(extractId('https://x/y?type=url')).toBe('');
  });

  it('非法 URL 返回空串', () => {
    expect(extractId('not a url')).toBe('');
  });

  it('空输入返回空串', () => {
    expect(extractId()).toBe('');
  });
});

describe('isPlayableUrl', () => {
  it('正常直链判定为可播', () => {
    expect(isPlayableUrl('https://x/y?id=5257138&type=url')).toBe(true);
  });

  it('id=undefined 的脏地址判定不可播', () => {
    expect(isPlayableUrl('https://x/y?id=undefined')).toBe(false);
  });

  it('无 id 判定不可播', () => {
    expect(isPlayableUrl('https://x/y?type=url')).toBe(false);
  });

  it('空值判定不可播', () => {
    expect(isPlayableUrl()).toBe(false);
  });
});

describe('extractAuth', () => {
  it('抠出 auth 签名', () => {
    expect(extractAuth('https://x/y?id=1&auth=abc')).toBe('abc');
  });

  it('没有 auth 返回 undefined', () => {
    expect(extractAuth('https://x/y?id=1')).toBeUndefined();
  });
});
