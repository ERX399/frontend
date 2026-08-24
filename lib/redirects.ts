// ⚠️ emergency-cf 分支上这份表已不是线上机制：应急路由表没有 redirect-splat，
// 静态重定向由 public/_redirects 的 CF 边缘 302 承担（见该文件注释）。两边条目
// 必须保持同步。ssr 分支恢复后仍由本文件 + redirect-splat 路由生效。
export const redirects: Record<string, string> = {
  '/privacy-policy': '/sponsors',
  '/long': 'https://iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii.iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii.in/',
  '/tit': '/posts/pin',
  '/q': '/posts/pin',
  '/t': 'https://i.2x.nz',
  '/ak': 'https://akile.io/register?aff_code=503fe5ea-e7c5-4d68-ae05-6de99513680e',
  '/yyb': 'https://www.rainyun.com/acofork_?s=bilibili',
  '/wly': 'https://w1.wlylogin.com:8888/#/register?code=FNQwOQBM',
  '/mly': 'https://muleyun.com/aff/GOTRJLPN',
  '/tly': 'https://tianlicloud.cn/aff/HNNCFKGP',
  '/kook': 'https://kook.vip/K29zpT',
  '/gal': '/posts/mac-gal',
  '/gay': 'https://list.yppp.net/@s/alFjjCRn',
  '/ok': 'https://acofork-uptime.zeabur.app/status/acofork',
  '/donate': '/sponsors',
  '/tg': 'https://t.me/+_07DERp7k1ljYTc1',
  '/esa': 'https://tianchi.aliyun.com/specials/promotion/freetier/esa?taskCode=25254&recordId=c856e61228828a0423417a767828d166',
  '/plan': 'https://acofork.notion.site/2e11e011d4e5800fa050e8f7cf448347',
  '/iku': 'https://ikuuu.de/',
  '/hnr': 'https://subspace.shop/products/lin-pianpian-keychain-the-weeping-swan-ten-days-of-the-citys-fall?_pos=1&_sid=5ba9d94dd&_ss=r',
  '/bd': 'https://pan.baidu.com/s/5IumozyRtM1U66d41M0s9pg',
  '/addqq': 'https://www.ifdian.net/item/3e7b83a0559311f1b74e52540025c377',
  '/7': 'https://store.steampowered.com/app/3946810/_',
};

export type RedirectKey = keyof typeof redirects;
