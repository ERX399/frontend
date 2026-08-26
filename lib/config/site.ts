declare const __BUILD_ID__: string;

export type NavLink = {
  label: string;
  icon: string;
  href: string;
  badge?: string;
};

export const siteConfig = {
  name: 'SVAF',
  siteName: '夏之',
  title: '《夏之》官方网站',
  subtitle: 'AcoFork',
  url: 'https://2x.nz',
  icon: `https://ker.520pro.top/awa.jpg`,
  description:
    '夏之的个人网站 —— 包含技术博客、论坛社区、实用在线工具等，记录分享技术与生活。',
  keywords: [
    '夏之', '夏之官网',
    '博客', 'AcoFork Blog', 'AcoFork', 'Blog', 'acofork blog', 'acofork',
  ],
  lang: 'zh_CN',
  ogImage: '/files/img/official.png',
  author: {
    name: 'AcoFork',
    url: 'https://2x.nz',
  },
  bio: {
    avatar: `https://ker.520pro.top/awa.jpg`,
    avatar2x: `https://ker.520pro.top/awa.jpg`,
    name: '夏之',
    bio: 'Protect What You Love.',
    links: [
      { name: '爱发电', icon: 'simple-icons:afdian', url: 'https://www.ifdian.net/a/acofork', color: '#946ce6' },
      { name: 'B站主页', icon: 'simple-icons:bilibili', url: 'https://space.bilibili.com/325903362', color: '#fb7299' },
      { name: 'QQ群', icon: '/icon/QQ.svg', url: 'https://qm.qq.com/q/FWqOHlwL2m' },
      { name: 'Telegram群', icon: 'simple-icons:telegram', url: 'https://t.me/+_07DERp7k1ljYTc1', color: '#0088cc' },
      { name: 'GitHub', icon: 'mdi:github', url: 'https://github.com/afoim', color: '' },
      { name: 'Folo', icon: 'simple-icons:folo', url: 'https://app.folo.is/share/feeds/245004133358075904', color: '#ff6b35' },
    ],
  },
  live: {
    statusApi: 'https://b-live.2x.nz',
    roomUrl: 'https://live.bilibili.com/12005649',
  },
  services: {
    nat: 'https://nat.2x.nz/api/analyze',
    statsShare: 'https://umami.2x.nz/share/CdkXbGgZr6ECKOyK',
    longDomain:
      'https://iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii.iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii.in',
  },
  analytics: {
    umami: { src: 'https://umami.2x.nz/script.js', websiteId: '5d710dbd-3a2e-43e3-a553-97b415090c63' },
    cfWebAnalytics: { token: '15fe148e91b34f10a15652e1a74ab26c' },
    baidu: { id: 'a87028bb5a1ed77d98f192bc12b56142' },
    google: { measurementId: 'G-RBZVQJCV26' },
    clarity: { projectId: 'v94yrasi99' },
  },
  giscus: {
    repo: 'ERX399/comments-data',
    repoId: 'R_kgDOUCZmNw',
    category: 'Announcements',
    categoryId: 'DIC_kwDOUCZmN84DEEGn',
  },
  repos: {
    // af_frontend / af_forum-backend 均为私有仓库，这两条仅作记录，不要渲染成站内链接
    frontend: 'https://github.com/afoim/af_frontend',
    backend: 'https://github.com/afoim/af_forum-backend',
    natTool: 'https://github.com/afoim/webrtc_check_nat',
  },
  links: {
    // 指向个人主页而非具体仓库：前端仓库已转私有，直链会 404
    github: 'https://github.com/afoim',
  },
  // 2026-08-07：论坛与交互小说随 Oracle VPS 下线且不再恢复，入口一并摘除；
  // B站封面需要服务端代请求 B 站接口，应急期同样不可用。
  navLinks: [
    { label: '博客', icon: 'mdi:post-outline', href: '/posts' },
    { label: '封面制作', icon: 'mdi:image-edit', href: '/cover' },
    { label: '水印', icon: 'mdi:water', href: '/watermark' },
    { label: '图片转换', icon: 'mdi:swap-horizontal-bold', href: '/convert' },
    { label: '文件', icon: 'mdi:folder-open', href: '/files' },
    { label: '友链', icon: 'mdi:link-variant', href: '/friends' },
    { label: '赞助', icon: 'mdi:heart', href: '/sponsors' },
    { label: '统计', icon: 'mdi:chart-line', href: 'https://umami.2x.nz/share/CdkXbGgZr6ECKOyK' },
  ] satisfies NavLink[],
};

export type SiteConfig = typeof siteConfig;
