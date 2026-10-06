export type Platform = 'netease' | 'kugou';

export type TrackKind = 'song' | 'playlist';

export interface Track {
  platform: Platform;
  id: string;
  name: string;
  artist: string;
  album?: string;
  cover?: string;
  lrc?: string;
  duration?: number;
  sourceUrl?: string;
  local?: boolean;
}

export interface ParsedLink {
  platform: Platform;
  id: string;
  kind: TrackKind;
}

export interface Provider {
  name: string;
  label: string;
  base: string;
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface ResolvedTrack extends Track {
  playUrl: string;
  fresh: boolean;
}
