'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import type { ResolvedTrack } from '@/lib/music';

const PLAY_ICONS = [
  { icon: 'lucide:play' },
  { icon: 'lucide:pause' },
] as const;

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  track: ResolvedTrack | null;
  onTimeUpdate?: (time: number) => void;
}

export function PlayerBar({ track, onTimeUpdate }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    setError(null);
    setCurrent(0);
    setDuration(0);
    audio.load();
    audio.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }, [track]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * duration;
  };

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div className="border border-border bg-card p-3">
      {/* 不加 crossOrigin：真实音频 CDN 不返回 CORS 头，一旦声明 anonymous
          浏览器会主动拒绝加载，本来能播的也会失败。 */}
      <audio
        ref={audioRef}
        src={track?.playUrl}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setCurrent(t);
          onTimeUpdate?.(t);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
        onError={() =>
          setError('无法播放：接口返回的直链可能已过期或被拒绝，请重新解析')
        }
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={!track}
          className="inline-flex size-9 shrink-0 items-center justify-center border border-border text-muted-foreground transition-colors hover:bg-foreground/15 hover:text-foreground disabled:opacity-40"
          aria-label={playing ? '暂停' : '播放'}
        >
          <Icon icon={PLAY_ICONS[playing ? 1 : 0].icon} className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-medium">
              {track?.name ?? '未选择曲目'}
            </span>
            {track?.artist && (
              <span className="truncate text-xs text-muted-foreground">{track.artist}</span>
            )}
          </div>
          <div
            className="mt-1.5 flex cursor-pointer items-center gap-2"
            onClick={seek}
            role="presentation"
          >
            <span className="w-9 shrink-0 text-right font-mono text-[10px] text-muted-foreground tabular-nums">
              {formatTime(current)}
            </span>
            <div className="h-1 flex-1 bg-muted">
              <div className="h-full bg-foreground" style={{ width: `${progress}%` }} />
            </div>
            <span className="w-9 shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <Icon icon="lucide:volume-2" className="size-3.5 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1 w-20 cursor-pointer accent-foreground"
            aria-label="音量"
          />
        </div>

        {track?.cover && (
          <img
            src={track.cover}
            alt=""
            className={cn('hidden size-9 shrink-0 object-cover md:block')}
          />
        )}
      </div>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <Icon icon="lucide:triangle-alert" className="size-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
