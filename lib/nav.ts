declare const __BUILD_ID__: string;

// 缓存刷新标记用构建期常量，不用 Date.now()：后者在服务端/客户端求值时刻不同，
// 会让头像 URL 水合失配（React #418）。
// spec=140（140px / 6KB）而不是 spec=0（原图 / 72KB）：这张图只在 header 里
// 显示成 28px，且**每个页面都有** —— 用原图等于全站每次首屏白扔 66KB。
// 与 siteConfig.bio.avatar 的 1x 档同一个 URL，首页两处共用一次请求。
export const SITE_ICON = `https://ker.520pro.top/awa.jpg`;
export const SITE_NAME = '夏之';

export interface NavLink {
  label: string;
  icon: string;
  href: string;
  badge?: string;
}

// 2026-08-07：论坛与交互小说随 Oracle VPS 下线且不再恢复，入口已摘除；
// B站封面需要服务端代请求 B 站接口（浏览器直连会被 CORS 拦），应急期同样不可用。
// 恢复时把对应条目加回 NAV_LINKS 与下面的分组数组即可。
export const NAV_LINKS: NavLink[] = [
  { label: '博客',     icon: 'mdi:post-outline',        href: '/posts' },
  { label: '论坛',     icon: 'mdi:forum',               href: '/forum' },
  { label: '友链',     icon: 'mdi:link-variant',        href: '/friends' },
  { label: '赞助',     icon: 'mdi:heart',               href: '/sponsors' },
  { label: '封面制作', icon: 'mdi:image-edit',          href: '/cover' },
  { label: '水印',     icon: 'mdi:water',               href: '/watermark' },
  { label: '图片转换', icon: 'mdi:swap-horizontal-bold',href: '/convert' },
  { label: '文件',     icon: 'mdi:folder-open',         href: '/files' },
  { label: '从夯到拉', icon: 'mdi:podium-gold',          href: '/tier' },
  { label: '状态',     icon: 'mdi:heart-pulse',          href: 'https://399520.xyz/zt' },
  { label: '统计',     icon: 'mdi:chart-line',          href: 'https://umami.520pro.top/share/v2IzYZRzKhBwoorB' },
];

export const PRIMARY_NAV = ['博客', '论坛', '友链', '赞助'];
export const TOOLS_NAV   = ['封面制作', '水印', '图片转换', '文件', '从夯到拉'];
// 外链（渲染在工具下拉/移动端菜单底部，带外链角标）
export const EXTERNAL_NAV = ['状态', '统计'];