/**
 * 把博客封面的**原图 URL** 换成本站缩略图端点的 URL。
 *
 * posts.json 里的 `image` 指向 raw-posts.520pro.top 上的原图（单张最大 697KB），
 * 而列表里只显示成 144×96。服务端 `thumbs.js` 负责真正的缩放，这里只做
 * URL 改写。两边的路径形态（`/thumb/<宽度>/<文件名>`）和允许的宽度必须一致 ——
 * 宽度不在 thumbs.js 的白名单里会被 302 回原图，白改一场。
 *
 * 非 raw-posts 域名的图片（外链封面）原样返回，不经过缩略图端点：源文件不在
 * 本地磁盘上，缩不了。
 */

const POSTS_DOMAIN = import.meta.env.VITE_POSTS_DOMAIN || 'https://raw-posts.520pro.top';

/** 与 thumbs.js 的 WIDTHS 白名单对应 */
export type ThumbWidth = 64 | 192 | 288;

export function coverThumb(url: string, width: ThumbWidth = 288): string {
  // ⚠️ 应急期（emergency-cf，Oracle VPS 故障）：/thumb 端点由 VPS 上的
  // thumbs.js 提供，随那台机器一起不可达。继续改写 URL 只会让列表页封面
  // 全部裂图，所以这里直接返回 raw-posts 上的原图 —— 代价是一页 30 篇约
  // 3MB 而非 94KB，但图能显示。VPS 恢复后删掉这一行即可回到缩略图。
  return url;

  const prefix = `${POSTS_DOMAIN}/img/`;
  if (!url.startsWith(prefix)) return url;
  const name = url.slice(prefix.length);
  // 文件名里有空格和中文（例如 `... - 副本.jpg`），必须编码；
  // 但已经编码过的（含 %）不要二次编码
  const safe = name.includes('%') ? name : encodeURIComponent(name);
  return `/thumb/${width}/${safe}`;
}

/**
 * 论坛配图（S3 上的任意 URL）。
 *
 * 2026-07-31：全站拆分后论坛独立为 bbs.acofork.com，缩略图端点 /thumb
 * 在 VPS 上、不归论坛 Worker 管，跨域请求 S3 原图直出。
 * 此前走 remoteThumb → /thumb/?u= 的路径已断，暂时返回原 URL，
 * 待缩略图服务独立部署后再恢复。
 */
export function remoteThumb(url: string, _width?: ThumbWidth): string {
  return url;
}
