import type { LyricLine } from './types';

const TIME_RE = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/**
 * 解析 LRC 歌词文本为按时间排序的行。
 *
 * 一行可能挂多个时间标签（`[00:01.00][00:05.00]同一句`），要展开成多条；
 * 没有时间标签的元信息行（`[ti:歌名]`）丢弃。纯文本歌词（无标签）按行号平均
 * 铺开是不可靠的，这里直接返回空数组，让 UI 走「无时间轴」分支原样滚动显示。
 */
export function parseLrc(text: string): LyricLine[] {
  if (!text) return [];

  const lines: LyricLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    TIME_RE.lastIndex = 0;
    const stamps: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = TIME_RE.exec(raw))) {
      stamps.push(toSeconds(m[1], m[2], m[3]));
    }
    if (!stamps.length) continue;

    const content = raw.replace(TIME_RE, '').trim();
    if (!content) continue;
    for (const time of stamps) lines.push({ time, text: content });
  }

  return lines.sort((a, b) => a.time - b.time);
}

function toSeconds(min: string, sec: string, frac?: string): number {
  const minutes = Number(min);
  const seconds = Number(sec);
  const ms = frac ? Number(frac.padEnd(3, '0')) / 1000 : 0;
  return minutes * 60 + seconds + ms;
}

/** 找出当前播放时刻对应的歌词行下标，没有匹配返回 -1 */
export function activeLineIndex(lines: LyricLine[], currentTime: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= currentTime) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}
