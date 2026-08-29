/**
 * /announcement —— 服务器故障公告（2026-08-11 改版）
 *
 * 内容收敛为三件事：论坛/交互小说永久下线、受影响账号的补录与找回、退款。
 * 页面本身不依赖任何后端 —— 故障期公告如果自己也会挂就毫无意义。
 */
import { Link } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { buttonVariants } from '@/components/ui/button';

const MAIL = 'e.r.x399@gmail.com';

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 mb-4 border-b border-border pb-2 text-xl font-bold">{children}</h2>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-y border-border py-4 text-sm leading-relaxed sm:border sm:p-4">
      {children}
    </div>
  );
}

/** 邮件模板：用户要照着抄，格式本身就是内容，必须用 pre 保真。
    复用 markdown 代码块那套 chrome（.code-block / .code-copy）：复制按钮由
    全局 CodeCopyListener 委托处理，样式在 globals.css，无需另行接线。
    监听器按 closest('.code-block') 找 pre code 取内容，所以这里必须保留
    .code-block 容器并给模板包 <code>。 */
function Template({ title, lines }: { title: string; lines: string }) {
  return (
    <div className="code-block border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 font-mono text-xs">
        <span className="min-w-0 truncate">{title}</span>
        <button type="button" className="code-copy shrink-0" title="复制代码">
          <Icon icon="mdi:content-copy" className="code-icon code-icon-copy" />
          <Icon icon="mdi:check" className="code-icon code-icon-copied" />
          <span className="code-copy-label">copy</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed whitespace-pre">
        <code>{lines}</code>
      </pre>
    </div>
  );
}

export default function AnnouncementPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      {/* 顶部红横幅：带底色块 full-bleed，文字回到内容竖线 */}
      <div className="-mx-4 border-y border-destructive bg-destructive/10 px-4 py-4 sm:mx-0 sm:border sm:p-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Icon icon="mdi:alert" className="size-6 shrink-0 text-destructive" />
          服务器故障公告
        </h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          发布时间：2026 年 8 月 11 日
        </p>
      </div>

      <H2>一、论坛与交互小说永久下线</H2>
      <p className="text-sm leading-relaxed">
        2026 年 8 月，承载本站主要服务的云服务器发生故障，经排查已确认无法恢复。
        论坛与交互小说的数据在本次故障中丢失，故<strong>永久下线</strong>，不再恢复。
      </p>
      <p className="mt-3 text-sm leading-relaxed">
        曾因使用这两项服务而充值、希望申请退款的用户，请参照下方
        <a href="#refund" className="underline">【四、退款】</a>。
      </p>

      <H2>二、你的账号是否受影响</H2>
      <p className="text-sm leading-relaxed">
        我们从备份中恢复了账号数据库，但备份的时间点是{' '}
        <strong>2026 年 7 月 25 日 凌晨 3 时 29 分</strong>。这意味着：
      </p>
      <div className="mt-4 space-y-4">
        <div className="border-l-2 border-border pl-4">
          <p className="font-medium">在此之前注册的账号</p>
          <p className="mt-1 text-sm text-muted-foreground">
            邮箱、密码、登录状态全部完好，无需任何操作。
          </p>
        </div>
        <div className="border-l-2 border-destructive pl-4">
          <p className="font-medium">在此之后注册的账号</p>
          <p className="mt-1 text-sm text-muted-foreground">
            账号资料（邮箱、密码）不在备份中，但余额、插队券、生成过的作品全部完好。
          </p>
        </div>
      </div>

      <H2>三、找回你的账号</H2>
      <div className="space-y-4">
        <div className="border-l-2 border-border pl-4">
          <p className="font-medium">仍有登录状态（打开网站未被要求重新登录）</p>
          <p className="mt-1 text-sm text-muted-foreground">
            直接补录即可：点击顶部横幅的「立即补录」，或访问{' '}
            <Link to="/building" className="underline">
              /building
            </Link>
            ，填写邮箱和一个新密码（至少 8 位），提交后即完成绑定。
          </p>
        </div>
        <div className="border-l-2 border-destructive pl-4">
          <p className="font-medium">已无登录状态</p>
          <p className="mt-1 text-sm text-muted-foreground">
            请发送邮件至{' '}
            <a href={`mailto:${MAIL}`} className="font-mono underline">
              {MAIL}
            </a>
            ，邮件中需写明：
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>· 证明材料（如交易流水截图）</li>
            <li>· 原账号 ID（在任意一笔爱发电交易中可以查到）</li>
            <li>· 要绑定的邮箱</li>
            <li>· 若该邮箱已被占用，是否需要强制解绑</li>
          </ul>
        </div>
      </div>
      <div className="mt-5">
        <Link to="/building" className={buttonVariants()}>
          立即补录账号
        </Link>
      </div>
      <Template
        title="邮件模板 —— 账号找回（可直接复制）"
        lines={`收件人：${MAIL}
主题：账号找回 - 你的用户名或充值时使用的昵称

正文：

一、要绑定的邮箱：
    （填写你今后用于登录的邮箱地址）

二、原账号 ID：
    （在任意一笔爱发电交易中可以查到的账号 ID）

三、证明材料：
    · 交易流水截图
      （微信或支付宝账单中对应的付款记录）
    · 其他辅助材料（如有）：生图作品截图、爱发电账号截图

四、若要绑定的邮箱已被占用：
    · 是否需要强制解绑？（是 / 否）
      若填「否」，请确保该邮箱并未被注册，否则请求无法受理`}
      />

      <H2>
        <span id="refund">四、退款</span>
      </H2>
      <p className="text-sm leading-relaxed">
        因论坛与交互小说永久下线，希望申请退款时，请发送邮件至{' '}
        <a href={`mailto:${MAIL}`} className="font-mono underline">
          {MAIL}
        </a>
        ，只需附上：
      </p>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        <li>· 交易流水证明（微信或支付宝账单中对应的付款记录截图）</li>
        <li>
          · 收款方信息（<strong>仅接受支付宝收款码或微信收款码</strong>，请确保清晰可扫）
        </li>
      </ul>
      <Template
        title="邮件模板 —— 退款申请（可直接复制）"
        lines={`收件人：${MAIL}
主题：退款申请 - 你的用户名或充值时使用的昵称

正文：

一、申请退款的原因与范围：
    （简要说明，例如：论坛/交互小说永久下线，申请退回相关充值）

二、必须附上的材料：
    · 交易流水截图
      （微信或支付宝账单中对应的付款记录）
    · 收款方信息
      （仅接受支付宝收款码或微信收款码，请确保清晰可扫）`}
      />

      <div className="mt-10 border-t border-border pt-5 text-sm text-muted-foreground">
        <p>
          如有其他问题，请联系：{' '}
          <a href={`mailto:${MAIL}`} className="font-mono underline">
            {MAIL}
          </a>
        </p>
        <p className="mt-1">本次故障给各位带来的不便，我们深表歉意。</p>
      </div>
    </main>
  );
}
