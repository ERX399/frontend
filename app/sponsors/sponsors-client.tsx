import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router';
import { siteConfig } from '@/lib/config/site';

interface Sponsor {
  name: string;
  avatar: string | null;
  date: string;
  amount: string;
}

const API = import.meta.env.VITE_FRIENDS_DOMAIN || 'https://raw-f.520pro.top';

const AFDIAN_URL =
  siteConfig.bio.links.find((l) => l.name === '爱发电')?.url || 'https://www.ifdian.net/a/ERX399';

/** 用爱发电链接本地生成二维码——白底矢量矩阵，每个深色块独立成小方块、块间留缝，
 *  格子感清晰，避免第三方二维码服务泄露内容 */
function SponsorQrCode({ url }: { url: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let cancelled = false;
    import('qrcode').then((m) => {
      const qr = (m.default ?? m).create(url, { errorCorrectionLevel: 'M' });
      if (cancelled) return;
      const size = qr.modules.size;
      const data = qr.modules.data as Uint8Array;
      const quiet = 2;
      const total = size + quiet * 2;
      const cells: string[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!data[r * size + c]) continue;
          // 铺满整个格子、无间隔，描一圈深灰边线：黑色块体 + 细灰分格
          cells.push(
            `<rect x="${c + quiet}" y="${r + quiet}" width="1" height="1" stroke="#4b5563" stroke-width="0.1"/>`
          );
        }
      }
      const svgTag =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
        `<rect width="${total}" height="${total}" fill="#fff"/>` +
        `<g fill="#000" shape-rendering="crispEdges">${cells.join('')}</g>` +
        `</svg>`;
      if (!cancelled) setSvg(svgTag);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [url]);
  if (!svg) return <Skeleton className="h-64 w-64" />;
  return (
    <div
      className="h-64 w-64 [&_svg]:h-full [&_svg]:w-full"
      role="img"
      aria-label="赞助二维码"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function SponsorsClient({ initial }: { initial?: Sponsor[] } = {}) {
  const [sponsors, setSponsors] = useState<Sponsor[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initial) return; // 已由 loader 服务端取好
    fetch(`${API}/sponsors.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Sponsor[]>;
      })
      .then((data) => {
        setSponsors(data as Sponsor[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold">赞助支持</h1>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 border-t border-border md:border-l">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border md:border-r py-4 md:p-4">
              <Skeleton className="h-12 w-12 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-4xl font-bold">赞助支持</h1>
        <p className="text-lg text-muted-foreground">
          感谢您的支持，您的赞助将帮助我持续创作优质内容
        </p>
      </div>

      {/* 去卡片：上下分隔线代替四边框，窄屏不再被 border + px 吃掉宽度 */}
      <div className="mb-12 flex flex-col items-center gap-4 border-y border-border py-8">
        <h2 className="text-2xl font-bold">赞助</h2>
        <SponsorQrCode url={AFDIAN_URL} />
        <p className="text-center text-xs text-muted-foreground">
          如果你是要
          <Link to="/posts/pin" className="underline underline-offset-2 hover:text-foreground">
            加群
          </Link>
          ，请前往置顶文章，使用爱发电进行赞助。这里只是纯赞助，无收益。
        </p>
      </div>

      <div>
        <h2 className="mb-6 text-2xl font-bold">赞助名单</h2>
        {sponsors.length === 0 ? (
          <p className="border-y border-border py-12 text-center text-muted-foreground">暂无赞助记录</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border-t border-border md:border-l">
            {sponsors.map((sponsor) => (
              <div key={sponsor.name} className="border-b border-border md:border-r bg-background py-4 md:p-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-12 w-12 shrink-0">
                    {sponsor.avatar && !failedImages.has(sponsor.name) ? (
                      <img
                        src={sponsor.avatar}
                        alt={sponsor.name}
                        className="h-12 w-12 rounded-full"
                        referrerPolicy="no-referrer"
                        onError={() => {
                          setFailedImages((prev) => new Set(prev).add(sponsor.name));
                        }}
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground">
                        {sponsor.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  {/* 名字 / 金额 / 日期竖排三行：金额与名字原本挤在同一行，
                      而金额可以很长（「6B币+800电池」「两个月充电」），四列网格下
                      每格仅 ~280px，名字直接被压成「我是个…」。各占一行后
                      名字能用满整格宽度 */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{sponsor.name}</div>
                    {/* 金色沿用站内既有的 amber（置顶徽章、友链 VIP 同一套） */}
                    <div className="text-sm font-medium text-amber-600 dark:text-amber-400">{sponsor.amount}</div>
                    <div className="text-sm text-muted-foreground">{sponsor.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
