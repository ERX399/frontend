'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { activeLineIndex, parseLrc, type LyricLine } from '@/lib/music';

interface Props {
  text: string;
  currentTime: number;
}

export function LyricPanel({ text, currentTime }: Props) {
  const [raw, setRaw] = useState<LyricLine[]>([]);
  const [plain, setPlain] = useState<string[]>([]);
  const activeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const parsed = parseLrc(text);
    setRaw(parsed);
    setPlain(parsed.length ? [] : text.split(/\r?\n/).filter((l) => l.trim()));
  }, [text]);

  const active = useMemo(() => activeLineIndex(raw, currentTime), [raw, currentTime]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [active]);

  if (!raw.length && !plain.length) {
    return (
      <div className="border border-border bg-card p-4 text-sm text-muted-foreground">
        暂无歌词
      </div>
    );
  }

  return (
    <div className="max-h-[320px] overflow-y-auto border border-border bg-card p-4">
      {raw.length ? (
        <div className="space-y-1.5 text-center">
          {raw.map((line, i) => (
            <p
              key={`${line.time}-${i}`}
              ref={i === active ? activeRef : undefined}
              className={
                i === active
                  ? 'text-sm font-medium text-foreground transition-colors'
                  : 'text-sm text-muted-foreground/60 transition-colors'
              }
            >
              {line.text}
            </p>
          ))}
        </div>
      ) : (
        <div className="space-y-1 text-sm text-muted-foreground">
          {plain.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
