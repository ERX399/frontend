'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  PLATFORMS,
  PLATFORM_BADGES,
  PLATFORM_LABELS,
  MusicError,
  fetchLyric,
  parseLink,
  resolve,
  search,
  type LocalAudio,
  type Platform,
  type ResolvedTrack,
  type Track,
} from '@/lib/music';
import { PlayerBar } from './player-bar';
import { LyricPanel } from './lyric-panel';
import { UploadFallback } from './upload-fallback';

const HOT_KEYWORDS = ['周杰伦', '晴天', '稻香', '夜曲', '五月天'];

/** 抽成常量表：图标子集扫描脚本只认紧跟在 icon= 后面的字符串字面量 */
const MODES = [
  { key: 'online', icon: 'lucide:globe', label: '在线解析' },
  { key: 'upload', icon: 'lucide:upload', label: '本地上传' },
] as const;

export function MusicClient() {
  const [platform, setPlatform] = useState<Platform>('netease');
  const [mode, setMode] = useState<'online' | 'upload'>('online');
  const [input, setInput] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const [track, setTrack] = useState<ResolvedTrack | null>(null);
  const [lyric, setLyric] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [localExport, setLocalExport] = useState<{ url: string; name: string } | null>(null);

  const runSearch = useCallback(
    async (keyword: string, target: Platform) => {
      const kw = keyword.trim();
      if (!kw) return;
      setBusy(true);
      setError(null);
      setDetail(null);
      setResults([]);
      try {
        const found = await search(target, kw);
        setResults(found);
      } catch (e) {
        setError(e instanceof Error ? e.message : '搜索失败');
        setDetail(e instanceof MusicError ? (e.detail ?? null) : null);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const play = useCallback(async (target: Platform, id: string) => {
    setBusy(true);
    setError(null);
    setDetail(null);
    try {
      const resolved = await resolve(target, id);
      setTrack(resolved);
      setCurrentTime(0);
      setLyric('');
      if (resolved.lrc) {
        fetchLyric(resolved.lrc)
          .then(setLyric)
          .catch(() => setLyric(''));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '解析失败');
      setDetail(e instanceof MusicError ? (e.detail ?? null) : null);
    } finally {
      setBusy(false);
    }
  }, []);

  const handleSubmit = () => {
    const value = input.trim();
    if (!value) return;
    const link = parseLink(value);
    if (link) {
      setPlatform(link.platform);
      void play(link.platform, link.id);
      return;
    }
    void runSearch(value, platform);
  };

  const handleLocal = (audio: LocalAudio) => {
    setError(null);
    setDetail(null);
    setLyric('');
    setLocalExport(audio.decrypted ? { url: audio.objectUrl, name: audio.exportName ?? audio.track.name } : null);
    setTrack({
      ...audio.track,
      cover: audio.coverUrl ?? audio.track.cover,
      playUrl: audio.objectUrl,
      fresh: false,
    });
    setCurrentTime(0);
  };

  useEffect(() => {
    return () => {
      if (track?.playUrl.startsWith('blob:')) URL.revokeObjectURL(track.playUrl);
    };
  }, [track]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex border border-border">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={
                'inline-flex h-8 items-center gap-1.5 px-3 text-sm transition-colors ' +
                (platform === p
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-foreground/15 hover:text-foreground')
              }
            >
              <span className="font-mono text-[10px] opacity-70">{PLATFORM_BADGES[p]}</span>
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="flex border border-border">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={
                'inline-flex h-8 items-center gap-1.5 px-3 text-sm transition-colors ' +
                (mode === m.key
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-foreground/15 hover:text-foreground')
              }
            >
              <Icon icon={m.icon} className="size-4" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'online' ? (
        <>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              placeholder="粘贴分享链接，或输入歌曲 / 歌手关键词"
              className="font-sans"
            />
            <Button onClick={handleSubmit} disabled={busy} className="shrink-0">
              {busy ? <Spinner className="size-4" /> : <Icon icon="lucide:search" className="size-4" />}
              解析
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>试试：</span>
            {HOT_KEYWORDS.map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => {
                  setInput(kw);
                  void runSearch(kw, platform);
                }}
                className="border border-border px-2 py-0.5 transition-colors hover:bg-foreground/15 hover:text-foreground"
              >
                {kw}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <Icon icon="lucide:triangle-alert" className="mt-0.5 size-4 shrink-0" />
              <div>
                <p>{error}</p>
                {detail && <p className="mt-1 font-mono text-xs opacity-70">{detail}</p>}
                <button
                  type="button"
                  onClick={() => setMode('upload')}
                  className="mt-2 underline underline-offset-2"
                >
                  改用本地上传 →
                </button>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="divide-y divide-border border border-border">
              {results.map((t, i) => (
                <button
                  key={`${t.id}-${i}`}
                  type="button"
                  onClick={() => void play(t.platform, t.id)}
                  className="flex w-full items-center gap-3 p-2.5 text-left transition-colors hover:bg-foreground/5"
                >
                  {t.cover ? (
                    <img src={t.cover} alt="" className="size-10 shrink-0 object-cover" />
                  ) : (
                    <div className="grid size-10 shrink-0 place-items-center bg-muted">
                      <Icon icon="lucide:music" className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.artist}</p>
                  </div>
                  <Icon icon="lucide:play" className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <UploadFallback onPick={handleLocal} />
      )}

      {track && (
        <div className="space-y-4">
          <PlayerBar track={track} onTimeUpdate={setCurrentTime} />
          {localExport ? (
            <a
              href={localExport.url}
              download={localExport.name}
              className="inline-flex h-8 items-center gap-1.5 border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-foreground/15 hover:text-foreground"
            >
              <Icon icon="lucide:download" className="size-4" />
              导出为 {localExport.name}
            </a>
          ) : (
            track.playUrl.startsWith('blob:') && (
              <a
                href={track.playUrl}
                download={track.name}
                className="inline-flex h-8 items-center gap-1.5 border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-foreground/15 hover:text-foreground"
              >
                <Icon icon="lucide:download" className="size-4" />
                导出本地文件
              </a>
            )
          )}
          {track.sourceUrl && (
            <a
              href={track.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-foreground/15 hover:text-foreground"
            >
              <Icon icon="lucide:external-link" className="size-4" />
              新标签打开直链（可右键另存为）
            </a>
          )}
          {lyric && <LyricPanel text={lyric} currentTime={currentTime} />}
        </div>
      )}
    </div>
  );
}
