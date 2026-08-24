/**
 * 全站路由级 SEO 元数据 —— 客户端（SeoManager）与 Cloudflare Worker（边缘注入）共用。
 *
 * 约束：本文件必须保持「纯数据 + 纯函数」，不得引入任何浏览器/React/Node API，
 * 否则 Worker 侧无法复用。站点常量在此独立维护（不 import siteConfig，
 * 避免把整棵配置树带进 Worker bundle）。
 */

// 相对路径而非 @ 别名：Worker 侧（wrangler/esbuild）打包时不依赖 tsconfig paths
import { redirects } from '../redirects';

export const SITE_NAME = '夏之';
export const SITE_URL = 'https://2x.nz';
export const SITE_TITLE = '《夏之》官方网站';
export const SITE_DESCRIPTION =
  '夏之的个人网站 —— 包含技术博客、论坛社区、AI 生图、实用在线工具等，记录分享技术与生活。';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/files/img/official.png`;

export interface RouteMeta {
  /** 页面标题（不含站名后缀）；空串表示直接使用 SITE_TITLE */
  title: string;
  description: string;
  /** 登录态/管理/工具性中间页不进搜索索引 */
  noindex?: boolean;
  ogType?: 'website' | 'article';
}

/** 拼接完整 <title>：`页面名 | 夏之`，首页用整站标题 */
export function formatTitle(title: string): string {
  return title ? `${title} | ${SITE_NAME}` : SITE_TITLE;
}

export const STATIC_ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    title: '',
    description: SITE_DESCRIPTION,
  },
  '/posts': {
    title: '博客文章',
    description:
      '夏之（AcoFork）的技术博客：开发笔记、教程踩坑、折腾记录与生活随笔，支持按分类、标签浏览与全文搜索。',
  },
  '/gallery': {
    title: '图库',
    description: '夏之的图库相册：摄影、截图与作品集锦在线浏览。',
  },
  '/friends': {
    title: '友情链接',
    description: '夏之的友情链接：收录互联网上朋友们的博客与网站，欢迎交换友链。',
  },
  '/sponsors': {
    title: '赞助鸣谢',
    description: '感谢每一位赞助者！这里是夏之网站的赞助名单与赞助方式说明。',
  },
  '/files': {
    title: '文件下载',
    description: '夏之的公开文件列表：软件、素材与资源文件直链下载。',
  },
  '/nat': {
    title: 'NAT 类型检测',
    description:
      '在线 NAT 类型检测工具：基于 WebRTC 检测你所在网络的 NAT 类型，联机游戏、P2P 连接疑难排查必备。',
  },
  '/ptg': {
    title: '隐藏图生成（幻影坦克）',
    description:
      '在线隐藏图（幻影坦克）生成工具：把两张图片合成一张，不同背景色下显示不同画面，纯浏览器本地处理不上传。',
  },
  '/timetable': {
    title: '时间表',
    description: '夏之的直播与日常安排时间表。',
  },
  '/privacy': {
    title: '隐私政策',
    description: '夏之网站隐私政策：说明本站收集的数据、Cookie 使用方式与第三方分析服务。',
  },
  '/agree': {
    title: '用户协议',
    description: '夏之网站用户协议：使用本站论坛、AI 生图等服务前请阅读的条款与说明。',
  },
  '/redirect-preview': {
    title: '重定向预览',
    description: '短链接重定向预览页。',
    noindex: true,
  },
  '/cover': {
    title: '视频封面制作工具',
    description:
      '在线视频封面制作工具：自定义文字、字体与布局，快速生成 B 站等平台风格的视频封面图，浏览器本地生成。',
  },
  '/watermark': {
    title: '图片水印工具',
    description:
      '在线图片加水印工具：批量为图片添加文字水印，自定义内容、透明度与平铺方式，本地处理不上传服务器。',
  },
  '/convert': {
    title: '图片格式转换工具',
    description:
      '在线图片格式转换工具：JPG、PNG、WebP、AVIF 等格式互转与压缩，浏览器本地转换，快速且保护隐私。',
  },
  '/bili-cover': {
    title: 'B站视频封面获取',
    description: '哔哩哔哩视频封面获取工具：输入 BV 号或视频链接，一键获取并下载 B 站视频高清封面原图。',
  },
  '/tier': {
    title: '从夯到拉',
    description:
      '从夯到拉：在线层级排行榜（Tier List）制作工具，上传图片后拖放排名，从最夯到最拉，本地生成可保存为图片。',
  },
  '/forum': {
    title: '论坛社区',
    description:
      '夏之论坛：技术交流与闲聊灌水社区，支持 Markdown 发帖、评论与点赞，欢迎注册加入讨论。',
  },
  '/forum/post/new': { title: '发布新帖', description: '在夏之论坛发布新帖子。', noindex: true },
  '/forum/auth/login': { title: '登录', description: '登录夏之论坛账号。', noindex: true },
  '/forum/auth/register': { title: '注册账号', description: '注册夏之论坛账号。', noindex: true },
  '/forum/auth/forgot-password': { title: '找回密码', description: '找回论坛账号密码。', noindex: true },
  '/forum/auth/reset-password': { title: '重置密码', description: '重置论坛账号密码。', noindex: true },
  '/forum/me': { title: '个人中心', description: '论坛个人中心。', noindex: true },
  '/forum/u': { title: '用户主页', description: '论坛用户主页。', noindex: true },
  '/forum/admin': { title: '论坛管理', description: '论坛管理面板。', noindex: true },
};

/** /posts/:slug 在真实文章数据到达前的兜底 meta（客户端随后覆写；Worker 侧查 posts.json 覆写） */
export const POST_FALLBACK_META: RouteMeta = {
  title: '博客文章',
  description: '来自夏之（AcoFork）博客的技术文章。',
  ogType: 'article',
};

/** /forum/post/:id 兜底 meta */
export const FORUM_POST_FALLBACK_META: RouteMeta = {
  title: '论坛帖子',
  description: '来自夏之论坛的帖子与讨论。',
  ogType: 'article',
};

export const REDIRECT_META: RouteMeta = {
  title: '正在重定向',
  description: '短链接跳转中。',
  noindex: true,
};

export const NOT_FOUND_META: RouteMeta = {
  title: '404 页面未找到',
  description: '你访问的页面不存在。',
  noindex: true,
};

/** 去掉尾斜杠（根路径除外），作为 map 查询键 */
export function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.replace(/\/+$/, '') : pathname;
}

/**
 * canonical 路径：全站规范形态为「无尾斜杠」（根路径除外）。
 * 与 TrailingSlashRedirect、边缘 301、sitemap、浏览量统计四处保持同一形态——
 * 任何一处漂移都会让同一页面产生两个 URL，分裂收录与访问计数。
 */
export function canonicalPath(pathname: string): string {
  return normalizePath(pathname);
}

export function resolveRouteMeta(pathname: string): RouteMeta {
  const path = normalizePath(pathname);
  const exact = STATIC_ROUTE_META[path];
  if (exact) return exact;
  if (path in redirects) return REDIRECT_META;
  if (path.startsWith('/posts/')) return POST_FALLBACK_META;
  if (path.startsWith('/forum/post/')) return FORUM_POST_FALLBACK_META;
  return NOT_FOUND_META;
}

/** 从 markdown/纯文本正文提取 meta description 摘要（纯函数，客户端与 Worker 共用） */
export function makeExcerpt(text: string, maxLength = 120): string {
  const plain = text
    .replace(/```[\s\S]*?```/g, ' ')      // 代码块
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接保留文字
    .replace(/<[^>]+>/g, ' ')             // HTML 标签
    .replace(/[#>*`~|-]+/g, ' ')          // 标记符号
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength)}…` : plain;
}

/**
 * BreadcrumbList JSON-LD（Google 富媒体结果：搜索结果里的层级路径）。
 * 面包屑链自动从 STATIC_ROUTE_META 的路径前缀推导：
 *   /posts/xxx      → 夏之 › 博客文章 › <文章标题>
 *   /forum/post/1   → 夏之 › 论坛社区 › <帖子标题>
 * 首页返回 null（无面包屑意义）。
 */
export function breadcrumbJsonLd(
  pathname: string,
  currentTitle: string,
): Record<string, unknown> | null {
  const path = normalizePath(pathname);
  if (path === '/') return null;
  const items: { name: string; item?: string }[] = [{ name: SITE_NAME, item: `${SITE_URL}/` }];
  const segs = path.split('/').filter(Boolean);
  let acc = '';
  for (let i = 0; i < segs.length - 1; i++) {
    acc += `/${segs[i]}`;
    const m = STATIC_ROUTE_META[acc];
    if (m && !m.noindex && m.title) items.push({ name: m.title, item: `${SITE_URL}${acc}` });
  }
  items.push({ name: currentTitle || SITE_NAME });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.item ? { item: it.item } : {}),
    })),
  };
}

/** 可进索引的静态路径（sitemap 用），无尾斜杠 */
export function indexableStaticPaths(): string[] {
  return Object.entries(STATIC_ROUTE_META)
    .filter(([, m]) => !m.noindex)
    .map(([p]) => canonicalPath(p));
}
