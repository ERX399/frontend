declare const __BUILD_ID__: string;

// 缓存刷新标记用构建期常量，不用 Date.now()：后者在服务端/客户端求值时刻不同，
// 会让头像 URL 水合失配（React #418）。
// spec=140（140px / 6KB）而不是 spec=0（原图 / 72KB）：这张图只在 header 里
// 显示成 28px，且**每个页面都有** —— 用原图等于全站每次首屏白扔 66KB。
// 与 siteConfig.bio.avatar 的 1x 档同一个 URL，首页两处共用一次请求。
export const SITE_ICON = '/awa.jpg';
export const SITE_NAME = '夏之';

export interface NavLink {
  label: string;
  icon: string;
  href: string;
  badge?: string;
  /** 侧栏折叠成图标栏时，用原生 title 兜住可读性 */
  title?: string;
}

export interface NavGroup {
  label: string;
  links: NavLink[];
}

// 2026-08-07：论坛与交互小说随 Oracle VPS 下线且不再恢复，入口已摘除；
// 2026-10-04：论坛已整体移除（前后端 + 数据），相关代码不再保留。
// 2026-10-05：导航从「顶部横排 + 工具下拉」改为左侧栏分组。
export const NAV_LINKS: NavLink[] = [
  { label: '首页',     icon: 'lucide:house', href: '/' },
  { label: '博客',     icon: 'lucide:file-text',         href: '/posts' },
  { label: '公告',     icon: 'lucide:bell',          href: '/announcements' },
  { label: '友链',     icon: 'lucide:link',         href: '/friends' },
  { label: '赞助',     icon: 'lucide:heart',                href: '/sponsors' },
  { label: '工具集',   icon: 'lucide:wrench',      href: '/tools' },
  { label: '封面制作', icon: 'lucide:image',           href: '/cover' },
  { label: '水印',     icon: 'lucide:droplet',                href: '/watermark' },
  { label: '图片转换', icon: 'lucide:arrow-left-right', href: '/convert' },
  { label: '从夯到拉', icon: 'lucide:trophy',          href: '/tier' },
  { label: '文件',     icon: 'lucide:folder-open',          href: '/files' },
  { label: '技术栈',   icon: 'lucide:layers',        href: '/stack' },
  { label: '统计',     icon: 'lucide:chart-line',           href: 'https://u.520pro.top' },
];

/** 侧栏分组。顺序即渲染顺序；空组会被自动跳过。
 *  各工具只从「工具集」页进入，侧栏不再逐项铺开。 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: '主页面',
    links: ['首页', '博客', '公告', '友链', '赞助'].map(
      (label) => NAV_LINKS.find((l) => l.label === label)!,
    ),
  },
  {
    label: '关于',
    links: ['工具集', '技术栈'].map(
      (label) => NAV_LINKS.find((l) => l.label === label)!,
    ),
  },
  {
    label: '外部',
    links: ['统计'].map((label) => NAV_LINKS.find((l) => l.label === label)!),
  },
];
