/**
 * 读预渲染页内嵌在 <script id="post-*" type="text/plain"> 里的 base64 载荷。
 *
 * 博客正文预渲染（scripts/emergency-prerender-posts.mts）会把每篇的 meta 与
 * 原始 markdown base64 后嵌进 HTML；SPA 接管时 PostDetailReader / PostBody
 * 从这里取数、跳过首拉，首屏内容不闪。只有首次挂载（预渲染页直开）时 DOM 里
 * 才有这些 script；客户端换篇后它们已被 React 替换掉，这里返回 null 走正常 fetch。
 */
export function readEmbeddedPostData(id: string): string | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById(id);
  if (!el?.textContent) return null;
  try {
    return new TextDecoder().decode(
      Uint8Array.from(atob(el.textContent.trim()), (c) => c.charCodeAt(0)),
    );
  } catch {
    return null;
  }
}
