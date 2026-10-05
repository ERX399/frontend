import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { TableOfContents } from '@/components/table-of-contents';
import { getPostPageviews, loadPageviews } from '@/lib/pageviews';

/** 浏览量：与文章详情页同源（u.520 按路径统计），本页路径是 /stack */
function StackPageviews({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);
  useEffect(() => loadPageviews(() => getPostPageviews(slug), setViews), [slug]);
  return (
    <span className="inline-flex items-center gap-1">
      <Icon icon="lucide:eye" className="size-3" />
      <span className="tabular-nums">
        {views === null ? '—' : views.toLocaleString()}
      </span>
      次浏览
    </span>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-10 mb-4 scroll-mt-20 border-b border-border pb-2 text-xl font-bold">
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed">{children}</p>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">{children}</code>;
}

interface Row {
  name: string;
  version?: string;
  note: string;
  lazy?: boolean;
}

function Table({ head, rows }: { head: string[]; rows: (string | Row)[] }) {
  return (
    <div className="stack-table mt-4 overflow-x-auto border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="border-b border-border bg-muted px-3 py-2 text-left font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            if (typeof r === 'string') {
              return (
                <tr key={i}>
                  <td
                    colSpan={head.length}
                    className="border-b border-border bg-muted/40 px-3 py-2 font-mono text-xs font-medium text-muted-foreground"
                  >
                    {r}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={i} className="transition-colors hover:bg-card">
                <td className="border-b border-border px-3 py-2 align-top">
                  <span className="font-mono">{r.name}</span>
                  {r.lazy && (
                    <span className="ml-2 border border-border px-1 font-mono text-[0.625rem] text-muted-foreground">
                      lazy
                    </span>
                  )}
                </td>
                {r.version !== undefined && (
                  <td className="border-b border-border px-3 py-2 align-top whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {r.version || '—'}
                  </td>
                )}
                <td className="border-b border-border px-3 py-2 align-top text-muted-foreground">{r.note}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const REPOS: (string | Row)[] = [
  '主站',
  { name: 'frontend', version: 'TypeScript', note: '博客主站：文章与工具页' },
  '数据',
  { name: 'blog-data', version: 'JavaScript', note: '文章源（Markdown）→ posts.json 分页索引' },
  { name: 'friends-data', version: 'JavaScript', note: '友链与赞助数据，社区 PR 自动审核' },
  { name: 'comments-data', version: '—', note: 'giscus 评论数据仓库' },
  '统计',
  { name: 'u-page', version: 'Python', note: '浏览量看板，从 umami 聚合后写成静态 JSON' },
  '静态资源',
  { name: 'ker', version: 'HTML', note: '图片、音乐等静态资源（ker.520pro.top）' },
];

const CORE: Row[] = [
  { name: 'react', version: '19.3.0', note: 'UI 框架' },
  { name: 'react-dom', version: '19.3.0', note: '渲染层' },
  { name: 'react-router', version: '8.4.0', note: '路由，路由级懒加载' },
  { name: 'vite', version: '8.3.2', note: '构建工具' },
  { name: 'typescript', version: '7.0.2', note: '类型系统' },
];

const STYLE: Row[] = [
  { name: 'tailwindcss', version: '4.3.3', note: '原子化样式' },
  { name: '@tailwindcss/vite', version: '4.3.3', note: 'Tailwind v4 的 Vite 插件' },
  { name: '@tailwindcss/typography', version: '0.5.20', note: '文章正文排版（prose）' },
  { name: 'clsx', version: '2.1.1', note: '条件类名拼接' },
  { name: 'tailwind-merge', version: '3.7.0', note: '合并冲突类名，与 clsx 组成 cn()' },
  { name: '@fontsource-variable/geist', version: '5.3.0', note: '正文可变字体' },
  { name: '@fontsource-variable/geist-mono', version: '5.3.0', note: '等宽字体，用于代码块' },
];

const CONTENT: Row[] = [
  { name: 'markdown-it', version: '15.0.2', note: 'Markdown 解析，接管 fence 与 link 渲染' },
  { name: 'highlight.js', version: '11.12.0', note: '代码高亮，按需引入语言' },
  { name: 'dompurify', version: '3.4.16', note: 'HTML 净化，渲染前过滤' },
  { name: 'mermaid', version: '11.17.2', note: '流程图与时序图渲染', lazy: true },
];

const UI: Row[] = [
  { name: '@iconify/react', version: '6.0.2', note: '图标运行时，仅用于动态图标名回退', lazy: true },
  { name: 'sonner', version: '2.0.8', note: 'Toast 提示' },
  { name: 'recharts', version: '3.10.1', note: '图表面板' },
  { name: 'qrcode', version: '1.5.4', note: '生成二维码（TOTP、赞助）', lazy: true },
  { name: 'browser-image-compression', version: '2.0.2', note: '上传图片压缩', lazy: true },
  { name: '@marsidev/react-turnstile', version: '1.6.1', note: '人机验证' },
];

export default function StackPage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex gap-8 relative">
        <article className="flex-1 min-w-0 max-w-3xl mx-auto">
          <div className="border border-border bg-card p-4 sm:p-6">
          <header className="mb-8 border-b border-border pb-6">
            <h1 className="text-3xl font-bold tracking-tight">技术栈</h1>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              本站不止一层依赖 —— 前端、数据源、后端服务、静态资源各占一层
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs leading-none text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Icon icon="lucide:calendar" className="size-3" />
                <time dateTime="2026-10-04">2026-10-04</time>
              </span>
              <span aria-hidden>·</span>
              <StackPageviews slug="stack" />
              <span aria-hidden>·</span>
              <span>6 个仓库</span>
              <span aria-hidden>·</span>
              <span>23 个依赖</span>
            </div>
          </header>

          <P>
            这个博客不是单体应用。前端、数据源、后端服务、静态资源各占一层，靠 Cloudflare
            与几台自建服务器串起来 —— 每一层只做一件事，坏了也好定位。
          </P>

          <H2 id="仓库全景">仓库全景</H2>
          <Table head={['仓库', '语言', '作用']} rows={REPOS} />

          <H2 id="前端--框架">前端 · 框架</H2>
          <Table head={['依赖', '版本', '作用']} rows={CORE} />

          <H2 id="前端--样式">前端 · 样式</H2>
          <P>
            样式基调是终端 shell 风：近黑灰阶背景、零圆角（全局 <Mono>border-radius: 0</Mono>）、反色选中。
            根字号压到 <Mono>93.5%</Mono>，全站 rem 等比缩一档。
          </P>
          <Table head={['依赖', '版本', '作用']} rows={STYLE} />

          <H2 id="前端--内容渲染">前端 · 内容渲染</H2>
          <Table head={['依赖', '版本', '作用']} rows={CONTENT} />

          <H2 id="前端--交互">前端 · 交互</H2>
          <P>
            标 <Mono>lazy</Mono> 的走动态 <Mono>import()</Mono>，不进首屏包。
            站内图标是构建期抽好的子集（<Mono>lib/icons/subset.json</Mono>），直接查表出
            SVG，只有接口返回的动态图标名才回退到运行时。
          </P>
          <Table head={['依赖', '版本', '作用']} rows={UI} />

          <H2 id="数据流">数据流</H2>
          <P>浏览量不直连 umami，而是走自建服务的中转，umami 不会随访问量受压：</P>
          <pre className="mt-4 overflow-x-auto border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
{`浏览器 → umami:3002 → postgres
                        ↓  u-page-refresh.py（每秒聚合一次）
                   静态 JSON
                        ↓  nginx:3001
                  Cloudflare 隧道（边缘缓存 1 秒）
                        ↓
                     博客 fetch`}
          </pre>

          <H2 id="基础设施">基础设施</H2>
          <Table
            head={['组件', '作用']}
            rows={[
              { name: 'Cloudflare Pages', note: 'frontend / friends-data 静态托管' },
              { name: 'Cloudflare Workers', note: 'blog-data / imgapi / llm-null' },
              { name: 'Cloudflare Tunnel', note: '把自建服务暴露到公网，隐藏真实 IP' },
              
              { name: '自建服务器', note: 'u-page 浏览量聚合、umami 统计' },
            ]}
          />
          </div>
        </article>

        <aside className="hidden xl:block w-[320px] flex-shrink-0">
          <div className="sticky top-20 space-y-8">
            <div className="border border-border bg-card p-4">
              <TableOfContents />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
