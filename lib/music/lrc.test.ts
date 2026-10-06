import { describe, expect, it } from 'vitest';
import { activeLineIndex, parseLrc } from './lrc';

describe('parseLrc', () => {
  it('解析基本时间标签', () => {
    const lines = parseLrc('[00:01.00]第一句\n[00:05.50]第二句');
    expect(lines).toEqual([
      { time: 1, text: '第一句' },
      { time: 5.5, text: '第二句' },
    ]);
  });

  it('展开一行多个时间标签', () => {
    const lines = parseLrc('[00:01.00][00:05.00]重复句');
    expect(lines).toEqual([
      { time: 1, text: '重复句' },
      { time: 5, text: '重复句' },
    ]);
  });

  it('丢弃没有时间标签的元信息行', () => {
    const lines = parseLrc('[ti:歌名]\n[00:01.00]正文\n[ar:歌手]');
    expect(lines).toEqual([{ time: 1, text: '正文' }]);
  });

  it('结果按时间升序排列', () => {
    const lines = parseLrc('[00:10.00]后\n[00:02.00]前');
    expect(lines.map((l) => l.text)).toEqual(['前', '后']);
  });

  it('纯文本歌词返回空数组', () => {
    expect(parseLrc('这是一首没有时间轴的歌词')).toEqual([]);
  });

  it('空输入返回空数组', () => {
    expect(parseLrc('')).toEqual([]);
  });

  it('冒号分隔的毫秒也能解析', () => {
    expect(parseLrc('[00:01:50]句')[0].time).toBe(1.5);
  });
});

describe('activeLineIndex', () => {
  const lines = parseLrc('[00:01.00]一\n[00:05.00]二\n[00:10.00]三');

  it('未到第一句返回 -1', () => {
    expect(activeLineIndex(lines, 0.5)).toBe(-1);
  });

  it('某句时间点当刻即命中该句', () => {
    expect(activeLineIndex(lines, 5)).toBe(1);
  });

  it('落在两句之间命中前一句', () => {
    expect(activeLineIndex(lines, 7)).toBe(1);
  });

  it('超过最后一句命中最后一句', () => {
    expect(activeLineIndex(lines, 999)).toBe(2);
  });
});
