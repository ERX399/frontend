import { useEffect, useState } from 'react';
import type { ImgHTMLAttributes } from 'react';

const RANDOM_ORIGIN = 'https://img.399520.xyz';

export function isRandomCover(src: string | null | undefined): boolean {
  return !!src && src.replace(/\/+$/, '') === RANDOM_ORIGIN;
}

export function useRandomCover(src: string | null | undefined): string | null {
  const [resolved, setResolved] = useState<string | null>(() =>
    src && !isRandomCover(src) ? src : null,
  );

  useEffect(() => {
    if (!src) {
      setResolved(null);
      return;
    }
    if (!isRandomCover(src)) {
      setResolved(src);
      return;
    }
    let cancelled = false;
    setResolved(null);
    fetch(`${RANDOM_ORIGIN}/api/random`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: { absUrl?: string; url?: string }) => {
        if (cancelled) return;
        if (d?.absUrl) setResolved(d.absUrl);
        else if (d?.url) setResolved(new URL(d.url, RANDOM_ORIGIN).toString());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src]);

  return resolved;
}

export function RandomCoverImg({
  src,
  srcSet,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> & {
  src: string | null | undefined;
  srcSet?: string;
}) {
  const resolved = useRandomCover(src);
  if (!resolved) return null;
  return <img src={resolved} srcSet={isRandomCover(src) ? undefined : srcSet} {...props} />;
}