import { Link } from 'react-router';

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 mb-4 border-b border-border pb-2 text-xl font-bold">{children}</h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mt-3 list-disc space-y-1.5 pl-6 text-sm leading-relaxed">{children}</ul>;
}

function Ol({ children }: { children: React.ReactNode }) {
  return <ol className="mt-3 list-decimal space-y-1.5 pl-6 text-sm leading-relaxed">{children}</ol>;
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">{children}</code>;
}

export default function PrivacyPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground">
        ← 返回首页
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">隐私政策</h1>
      <p className="mt-2 font-mono text-sm text-muted-foreground">
        最后更新：<time dateTime="2026-05-27">2026-05-27</time>
      </p>

      <H2>信息收集与使用</H2>
      <P>你使用本站服务时，我们可能收集以下类型的信息：</P>
      <Ol>
        <li><strong>账号信息：</strong> 注册论坛时你提供的用户名、邮箱地址及头像。</li>
        <li><strong>使用数据：</strong> 访问记录、页面浏览量、操作日志、生成的图片记录及提示词历史。</li>
        <li><strong>设备信息：</strong> 浏览器类型、操作系统、IP 地址及设备标识符（通过第三方分析服务收集）。</li>
      </Ol>

      <H2>Cookie 及本地存储的使用</H2>
      <P>本站使用以下 Cookie 及浏览器存储技术：</P>
      <P><strong>必要（始终加载）：</strong></P>
      <Ul>
        <li>Umami Analytics（自托管）— 收集匿名访问数据，用于统计页面浏览量</li>
        <li>Web Analytics — 匿名访问统计，无 Cookie、无指纹追踪</li>
        <li>人机验证 — 用于登录、注册、发帖等操作（如 Turnstile）</li>
      </Ul>
      <P><strong>功能（需同意）：</strong></P>
      <Ul>
        <li>Giscus — 基于 GitHub Discussions 的评论系统</li>
      </Ul>
      <P><strong>分析（需同意）：</strong></P>
      <Ul>
        <li>百度统计 — 站点访问情况分析</li>
        <li>Google Analytics (GA4) — 用户行为分析</li>
        <li>Microsoft Clarity — 用户体验分析</li>
      </Ul>
      <P><strong>浏览器本地存储：</strong></P>
      <Ul>
        <li><InlineCode>cookie-consent-preferences</InlineCode> — Cookie 同意偏好设置</li>
        <li><InlineCode>theme</InlineCode> — 用户主题偏好（亮色/暗色/跟随系统）</li>
        <li>论坛相关键名 — 登录凭证及环境配置</li>
      </Ul>

      <H2>第三方服务</H2>
      <P>本站集成以下第三方服务，它们可能独立收集你的数据：</P>
      <Ul>
        <li>Umami（自托管）— 服务器位于本站运营者控制的服务器上</li>
        <li>
          GitHub（Giscus）— 评论系统（美国），受{' '}
          <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener noreferrer" className="underline">
            GitHub 隐私政策
          </a>{' '}
          约束
        </li>
        <li>Google Analytics（美国）— 用户行为分析（需用户同意后激活）</li>
        <li>Microsoft Clarity（美国）— 用户体验分析（需用户同意后激活）</li>
      </Ul>
      <P>
        我们使用全球融合 CDN 加速您的访问体验，包括但不限于 Cloudflare、Vercel
        等。这些 CDN 可能不会同时使用，但我们可能会在不同时期使用不同的 CDN
        以保证您最佳的访问体验。您知悉不同的 CDN
        厂商的隐私政策不同，详细可前往他们的官网查看详细信息。此外，页面可能按需加载来自
        jsdelivr、cdnjs 及 api.iconify.design 等公共 CDN
        的资源，这些请求可能暴露你的 IP 地址给第三方服务商。
      </P>

      <H2>数据存储与安全</H2>
      <P>
        你生成的内容（包括图片及提示词）存储在本站运营者控制的服务器上。我们采取合理的技术措施保护你的数据安全，但互联网传输无法保证绝对安全。论坛账号密码经过加密存储，但我们建议你不要在多个站点使用相同的密码。
      </P>

      <H2>数据保留与删除</H2>
      <P>
        你的账号信息及生成内容在你注销账号前将持续保留。即使你在账号界面中删除相关记录，本站仍可能在后端保留副本用于审核、统计及合法合规目的。Cookie
        同意偏好存储在浏览器本地，你可随时清除。统计分析数据的保留期限由各第三方服务商的政策决定。
      </P>

      <H2>你的权利</H2>
      <P>你享有以下权利：</P>
      <Ul>
        <li><strong>知情权：</strong> 本隐私政策向您说明了我们收集哪些信息及如何使用。</li>
        <li><strong>选择权：</strong> 您可以通过页面底部的「Cookie 与偏好设置」选择是否允许功能 Cookie 及分析 Cookie。</li>
        <li><strong>删除权：</strong> 您可以通过论坛设置删除您的账号（功能开发中），或通过清除浏览器 localStorage 删除本地存储的数据。</li>
        <li><strong>撤回同意：</strong> 您随时可以通过页面底部的「Cookie 与偏好设置」按钮撤回 Cookie 同意（撤回不影响撤回前基于同意的处理的合法性）。</li>
      </Ul>

      <H2>协议更新</H2>
      <P>我们可能会不时更新本隐私政策。更新后的政策将在本站发布，并注明最后更新日期。重大变更我们会通过站内公告等方式通知你。</P>
    </main>
  );
}
