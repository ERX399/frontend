import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { PulsatingButton } from '@/components/ui/pulsating-button';
import { siteConfig } from '@/lib/config/site';

// ─── 功能卡片数据 ─────────────────────────────────────────────────────────────

const CFIcon = () => (
  <Icon icon="simple-icons:cloudflare" className="size-3.5 inline-block align-middle" />
);
const InlineIcon = ({ icon, className = "size-3.5" }: { icon: string; className?: string }) => (
  <Icon icon={icon} className={`${className} inline-block align-middle`} />
);

const FEATURES: Array<{
  icon: string;
  title: string;
  desc: string | React.ReactNode;
  /** null = 非导航卡（点击触发行为，如展开工具菜单）；有 ctas 时此项被忽略 */
  href: string | null;
  cta: string;
  /** 一张卡有多个去处时用它：卡片本体不再整体可点，底部并列多个入口 */
  ctas?: { label: string; href: string }[];
  badge?: string;
  tags?: string[];
}> = [
  {
    icon: 'mdi:post-outline',
    title: '技术博客',
    desc: <>记录前端、后端、DevOps、ServerLess 与 <CFIcon /> Cloudflare 的技术探索，定期更新，支持 <Icon icon="mdi:rss" className="size-3 inline-block align-middle" /> RSS 订阅</>,
    href: '/posts',
    cta: '阅读文章',
  },
    {
    icon: 'mdi:toolbox-outline',
    title: '实用工具集',
    desc: '封面制作、B站封面下载、图片水印、格式转换——一站式解决创作周边需求',
    href: null,
    cta: '使用工具',
    tags: ['封面制作', '水印', '图片转换', 'B站封面'],
  },
  {
    icon: 'mdi:link-variant',
    title: '友链 & 赞助',
    desc: '与志同道合的创作者互换友链；如果这里的内容帮到了你，欢迎考虑赞助支持',
    href: '/friends',
    cta: '查看友链',
    ctas: [
      { label: '查看友链', href: '/friends' },
      { label: '查看赞助', href: '/sponsors' },
    ],
  },
];

const arrowSvg = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

// ─── SPA 缓存 ─────────────────────────────────────────────────────────────────

class SPACache {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  async get<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();
    if (cached && (!ttl || now - cached.timestamp < ttl)) return cached.data as T;
    const data = await fetcher();
    this.cache.set(key, { data, timestamp: now });
    return data;
  }
}

const spaCache = new SPACache();

// ─── 组件 ─────────────────────────────────────────────────────────────────────

export function HomeClient() {
  const [isLive, setIsLive] = useState(false);
  const initialized = useRef(false);

  const checkLiveStatus = useCallback(async () => {
    const status = await spaCache.get(
      'live-status',
      async () => {
        try {
          const r = await fetch(siteConfig.live.statusApi);
          return r.ok ? (await r.text()).trim() === '1' : false;
        } catch { return false; }
      },
      30000,
    );
    setIsLive(status);
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    checkLiveStatus();
    const id = setInterval(checkLiveStatus, 30000);
    return () => clearInterval(id);
  }, [checkLiveStatus]);

  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-[calc(100vh-56px)] py-24 px-4 text-center">
        {/* 头像 */}
        <div className="relative inline-flex items-center justify-center mb-8">
          {isLive && (<><div className="live-ring"/><div className="live-ring"/><div className="live-ring"/></>)}
          <div className="h-28 w-28 rounded-full overflow-hidden relative">
            <img
              src={siteConfig.bio.avatar}
              srcSet={`${siteConfig.bio.avatar} 1x, ${siteConfig.bio.avatar2x} 2x`}
              alt={siteConfig.bio.name}
              width={112}
              height={112}
              fetchPriority="high"
              className="h-full w-full object-cover"
              draggable={false}
            />
            {/* 这个 <a> 是盖在头像上的透明热区，没有可见文字 —— 必须给 aria-label，
                否则读屏只会念出一个"链接"，Lighthouse 也报 link-name */}
            {isLive && <a href={siteConfig.live.roomUrl} target="_blank" rel="noopener noreferrer" aria-label={`${siteConfig.bio.name}正在直播，前往 Bilibili 直播间`} className="absolute inset-0 z-10"/>}
          </div>
          {isLive && <div className="live-badge"><div className="live-dot"/><span>直播中</span></div>}
        </div>

        {/* 标题 + Slogan */}
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">{siteConfig.bio.name}</h1>
        <p className="text-xl text-muted-foreground mb-3 max-w-xl">
          Protect What You Love.
        </p>
        {/* /80 是这套配色下能过 WCAG AA 的最低透明度：/70 实测只有 4.0:1，
            /60 是 3.3:1，都不到 4.5:1。此前满屏 canvas 盖着，axe 判不出背景色
            才没报出来 */}
        <p className="text-base text-muted-foreground/80 mb-10 max-w-lg">
          <InlineIcon icon="mdi:post-outline" /> 技术博客 · <InlineIcon icon="mdi:forum" /> 社区论坛 · <InlineIcon icon="mdi:toolbox-outline" /> 实用在线工具集
        </p>

        {/* 主要 CTA */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/posts">
            <Button size="lg" className="gap-2">
              <Icon icon="mdi:post-outline" className="size-4" />
              阅读博客
            </Button>
          </Link>
        </div>

        {/* 向下箭头 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground/40 animate-bounce">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>
      </section>

      {/* ── 功能 ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-3">探索我在做什么</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              从技术博客到实用在线工具，这里是我的数字花园
            </p>
          </div>
          {/* 单列（<sm）时不画左右竖线：手机上一行只有一张卡，
              竖框线除了把内容挤窄没有别的作用 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px border-y border-border sm:border bg-border">
            {FEATURES.map((f) => {
              const cardClass = "group relative flex flex-col gap-4 bg-background py-6 sm:p-6 hover:bg-card transition-colors duration-75 text-left w-full h-full";
              const inner = (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon icon={f.icon} className="size-5" />
                    </div>
                    {f.badge && (
                      <Badge className="px-1.5 py-px text-[10px]">{f.badge}</Badge>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base mb-1.5 group-hover:text-primary transition-colors">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                  {'tags' in f && f.tags && (
                    <div className="flex flex-wrap gap-1.5">
                      {f.tags.map(t => (
                        <span key={t} className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  )}
                  {f.ctas ? (
                    // 多入口：每个 CTA 各自可点，卡片本体不再是链接
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      {f.ctas.map((c) => (
                        <Link
                          key={c.href}
                          to={c.href}
                          className="text-sm font-medium text-primary/80 hover:text-primary hover:underline underline-offset-4 transition-colors inline-flex items-center gap-1"
                        >
                          {c.label}
                          {arrowSvg}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-primary/80 group-hover:text-primary transition-colors inline-flex items-center gap-1">
                      {f.cta}
                      {arrowSvg}
                    </span>
                  )}
                </>
              );

              if (f.ctas) {
                // 去掉 group：卡片本体不可点，标题不应有「整卡可点」的 hover 暗示
                return (
                  <div key={f.title} className={cardClass.replace('group ', '')}>
                    {inner}
                  </div>
                );
              }

              if (f.href === null) {
                return (
                  <button
                    key={f.title}
                    className={cardClass}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-tools-dropdown'));
                    }}
                  >
                    {inner}
                  </button>
                );
              }

              return (
                <Link key={f.href} to={f.href} className={cardClass}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 关于 ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 border-t border-border/40">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-6">关于我们</h2>
          <p className="text-muted-foreground leading-relaxed text-base mb-4">
            你好，我是<strong className="text-foreground">夏之</strong>，这个站点的创意提供者。
            我不是程序员——这里的所有代码、功能与设计，都由 <strong className="text-foreground">大语言模型（LLM）</strong>（<InlineIcon icon="ri:claude-fill" className="size-3" /> Claude / <InlineIcon icon="simple-icons:openai" className="size-3" /> ChatGPT / <InlineIcon icon="simple-icons:googlegemini" className="size-3" /> Gemini / <InlineIcon icon="simple-icons:x" className="size-3" /> Grok / <InlineIcon icon="thesvg:zhipu" className="size-3" /> GLM / <InlineIcon icon="simple-icons:minimax" className="size-3" /> MiniMax / <InlineIcon icon="simple-icons:qwen" className="size-3" /> Qwen / <InlineIcon icon="simple-icons:deepseek" className="size-3" /> DeepSeek）完成。
          </p>
          <p className="text-muted-foreground leading-relaxed text-base mb-4">
            我负责提需求和把关方向，AI 负责写代码和修 bug。从 <CFIcon /> Cloudflare Workers 到前端界面，
            每一行代码都是 AI 生成的——我只做最轻松的部分：想点子。
          </p>
          <p className="text-muted-foreground leading-relaxed text-base">
            这个网站是我的数字花园——<InlineIcon icon="mdi:post-outline" /> 技术博客记录探索过程，<InlineIcon icon="mdi:forum" /> 论坛沉淀交流内容，
            <InlineIcon icon="mdi:toolbox-outline" /> 实用在线工具集是日常开发的副产品，开放给有需要的人使用。
          </p>
        </div>
      </section>

      {/* ── 社交 & 联系 ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4 border-t border-border/40 bg-muted/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-2">关注 & 联系</h2>
          <p className="text-muted-foreground text-sm mb-8">在这些平台上找到我</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {siteConfig.bio.links.map((link) => {
              const isLocalImage = link.icon.startsWith('/');
              const isBilibili = link.name === 'B站主页';
              const iconNode = isLocalImage
                ? <img src={link.icon} alt={link.name} className="w-4 h-4" />
                : <Icon icon={link.icon} className="w-4 h-4" style={link.color ? { color: link.color } : undefined} />;

              return isBilibili ? (
                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer">
                  <PulsatingButton pulseColor="#fb7299" duration="1.5s" distance="5px" className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-lg">
                    {iconNode}<span>{link.name}</span>
                  </PulsatingButton>
                </a>
              ) : (
                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2 h-9 px-4 text-sm font-medium rounded-lg">
                    {iconNode}<span>{link.name}</span>
                  </Button>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <style>{`
        @keyframes live-pulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:.8;transform:scale(1.05)}
        }
        @keyframes live-ring {
          0%{transform:scale(1);opacity:1}
          100%{transform:scale(1.5);opacity:0}
        }
        .live-ring{
          position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;
          border:2px solid #ff2d55;
          animation:live-ring 1.5s ease-out infinite;pointer-events:none;
        }
        .live-ring:nth-child(2){animation-delay:.5s}
        .live-ring:nth-child(3){animation-delay:1s}
        .live-badge{
          position:absolute;bottom:0;right:0;
          background:#ff2d55;
          color:#000;padding:4px 12px;
          font-size:12px;font-weight:bold;
          font-family:var(--font-geist-mono);
          display:flex;align-items:center;gap:4px;
          animation:live-pulse 2s ease-in-out infinite;pointer-events:none;
        }
        .live-dot{width:6px;height:6px;background:#000;animation:live-pulse 1s ease-in-out infinite}
      `}</style>
    </>
  );
}