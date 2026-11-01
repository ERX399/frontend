const STAMP_KEY = 'shell:auto-reload';
const MIN_GAP = 20_000;

const STALE_CHUNK_PATTERN =
  /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk .* failed|Unable to preload CSS|Loading CSS chunk .* failed/i;

/** 线上 SPA 回退会把 404 的 chunk 以 200 + HTML 兜底回来，报错就变成模块形状不对 */
const MODULE_SHAPE_PATTERN =
  /reading 'default'|does not provide an export named|Expected a JavaScript module script/i;

export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return STALE_CHUNK_PATTERN.test(message);
}

/** 错误边界用的宽版：模块没加载成，或加载到了但不是合法 JS（兜底 HTML），都按「站点刚更新」处理 */
export function isLikelyStaleModuleError(error: unknown): boolean {
  if (isStaleChunkError(error)) return true;
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return MODULE_SHAPE_PATTERN.test(message);
}

export function canAutoReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(STAMP_KEY) || 0);
    return Date.now() - last >= MIN_GAP;
  } catch {
    return false;
  }
}

export function releaseAutoReload(): void {
  try {
    sessionStorage.removeItem(STAMP_KEY);
  } catch {
    /* 存储不可用时本来就没有闸门，手动刷新直接生效 */
  }
}

export function reloadOnce(cause: string): boolean {
  if (!canAutoReload()) return false;
  try {
    sessionStorage.setItem(STAMP_KEY, String(Date.now()));
  } catch {
    return false;
  }
  console.warn(`[auto-reload] ${cause}`);
  window.location.reload();
  return true;
}

export function installAutoReload(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('vite:preloadError', (event) => {
    // 不拦下的话 Vite 会继续把它抛成 window.onerror，页面直接白屏，没机会自救
    event.preventDefault();
    reloadOnce('preload');
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isStaleChunkError(event.reason)) reloadOnce('chunk');
  });
}

