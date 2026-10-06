export type { Platform, Track, TrackKind, ParsedLink, ResolvedTrack, LyricLine } from './types';
export { PLATFORMS, PLATFORM_LABELS, PLATFORM_BADGES, PROVIDERS } from './providers';
export { search, resolve, fetchLyric, MusicError } from './engine';
export { parseLink } from './links';
export { parseLrc, activeLineIndex } from './lrc';
export { parseLocalAudio, type LocalAudio } from './id3';
export { decryptNcm, isNcmFile, NcmError, type NcmResult } from './ncm';
