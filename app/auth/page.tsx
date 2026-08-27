'use client';

/**
 * /auth —— 全站统一登录页
 *
 * 登录、注册、找回密码、孤儿账号补录四件事收在一处，由一个 mode 驱动而不是四条
 * 路由：这些状态之间来回切换很频繁（登录失败想去注册、注册完想登录），拆成路由
 * 每次都要整页跳转。
 *
 * 后端是 Auth Worker（i.2x.nz），全站唯一的账号权威。生图等业务层只拿同一份
 * JWT 本地验签、只认 exp，不再有各自的账号接口。
 *
 * 两件必须知道的事：
 *
 * 1. **WAF 对鉴权口压的是 10s 一次/IP**。所以这页不做任何「顺手多问一个接口」
 *    的事：进页面只调一次 accountState()，登录成功后直接跳走不回读。密码打错
 *    重试也要等 10 秒 —— 错误提示里必须说清楚，否则用户会以为是页面卡了。
 *
 * 2. **登录态直接解本地 JWT**，不问服务端。payload 是 base64url、不是加密，
 *    前端自己读得到；服务端也确实没有 /api/user/me 了。
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import {
  login,
  register,
  forgotPassword,
  claimAccount,
  accountState,
  githubStartUrl,
  decodeToken,
  isTokenValid,
  setToken,
  logout,
  type AccountState,
} from '@/lib/account/api';

type Mode = 'login' | 'register' | 'forgot' | 'claim';

const inputCls =
  'w-full border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground';

/** 只接受站内路径，否则就是个开放重定向 */
function safeNext(raw: string | null): string {
  if (!raw) return '/draw';
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/draw';
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [checking, setChecking] = useState(true);
  const [state, setState] = useState<AccountState | null>(null);

  const identity = decodeToken();

  // 进页面判一次当前状态。三种可能：未登录 / 已登录 / 孤儿。
  //
  // 孤儿的判据是「本地 token 没过期，但服务端说不认识你」—— 那批用户的签名是
  // 有效的（JWT_SECRET 没变过），只是 users 表里没有他们的行，服务端 authenticate
  // 查不到就返回 401。这是现在唯一能识别他们的信号：/api/user/me 已经不存在了。
  // GitHub 回跳失败时 OAuthTokenCatcher 会把人送回这里并带上原因
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('github_error');
    if (!reason) return;
    const human: Record<string, string> = {
      github_email_unavailable: 'GitHub 账号没有可用的公开邮箱，请在 GitHub 设置里公开邮箱后重试',
      email_conflict: '该 GitHub 账号的邮箱已被站内其他账号占用，请改用邮箱密码登录',
      create_user_failed: '创建账号失败，请稍后重试',
      login_failed: 'GitHub 登录失败，请重试',
      internal_error: '服务端出错了，请稍后重试',
    };
    setErr(human[reason] || `GitHub 登录失败（${reason}）`);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isTokenValid()) {
        if (alive) setChecking(false);
        return;
      }
      try {
        const s = await accountState();
        if (alive) setState(s);
      } catch (e: any) {
        if (alive && e?.status === 401) setMode('claim');
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErr('');
      setOk('');
      setBusy(true);
      try {
        if (mode === 'login') {
          const r = await login(email, password);
          setToken(r.token);
          const q = new URLSearchParams(window.location.search);
          // 两种参数名都认：新代码发 next，用户浏览器里缓存的旧 bundle 发 redirect
          window.location.href = safeNext(q.get('next') || q.get('redirect'));
        } else if (mode === 'register') {
          const r = await register(email, password);
          setOk(r.message || '注册成功，请前往邮箱完成验证');
          setMode('login');
        } else if (mode === 'forgot') {
          const r = await forgotPassword(email);
          setOk(r.message || '如果该邮箱已注册，重置邮件已发出，请查收（含垃圾箱）');
        } else {
          const r = await claimAccount(email, password);
          setToken(r.token);
          setOk(r.message || '账号已补录');
          setMode('login');
          setState(null);
          navigate('/draw');
        }
      } catch (e: any) {
        setErr(e?.message || '操作失败');
      } finally {
        setBusy(false);
      }
    },
    [mode, email, password, navigate],
  );

  const switchMode = (m: Mode) => {
    setMode(m);
    setErr('');
    setOk('');
  };

  if (checking) {
    return (
      <main className="container mx-auto max-w-lg px-4 py-16">
        <p className="text-center font-mono text-sm text-muted-foreground">检查登录状态…</p>
      </main>
    );
  }

  // 已登录且账号正常
  if (state && identity) {
    return (
      <main className="container mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-4 border-b border-border pb-3 text-2xl font-bold">账号</h1>
        <dl className="space-y-2 py-4 font-mono text-sm">
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-muted-foreground">邮箱</dt>
            <dd className="min-w-0 break-all">{identity.email}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-muted-foreground">UID</dt>
            <dd>{identity.id}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-muted-foreground">GitHub</dt>
            <dd className="min-w-0 break-all">
              {state.github ? state.github.login || `#${state.github.id}` : '未绑定'}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-3 border-t border-border pt-4">
          {/* Shell UI 的 Button 没有 asChild（不是 Radix），跳转用 Link + buttonVariants */}
          <Link to="/draw" className={buttonVariants()}>
            去生图
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              logout();
              setState(null);
              switchMode('login');
            }}
          >
            退出登录
          </Button>
        </div>
        <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          退出登录只是让这台设备忘掉令牌。令牌本身在签发后 7 天内始终有效，服务端不做吊销。
        </p>
      </main>
    );
  }

  const isClaim = mode === 'claim';
  const title =
    mode === 'register' ? '注册' : mode === 'forgot' ? '找回密码' : isClaim ? '补录账号' : '登录';

  return (
    <main className="container mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-4 border-b border-border pb-3 text-2xl font-bold">{title}</h1>

      {isClaim && (
        <div className="mb-5 border-y border-border py-4 text-sm leading-relaxed sm:border sm:p-4">
          <p className="mb-2 flex items-center gap-2 font-medium">
            <Icon icon="mdi:alert" className="size-4 shrink-0" />
            这个账号需要补录邮箱
          </p>
          <p className="text-muted-foreground">
            服务器故障导致备份缺失了一部分账号资料，你的登录信息不在其中，但{' '}
            <strong className="text-foreground">余额与作品都还在</strong>
            （UID {identity?.id}）。趁现在还是登录状态，设置一个邮箱和密码即可把账号找回来 ——
            一旦退出登录就没法自证身份了。
          </p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="auth-email">邮箱</Label>
          <input
            id="auth-email"
            type="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        {/* 不再要用户名：业务层只认 user_id，账号页也只展示 ID + 邮箱。
            后端拿不到 username 会自己生成 `user<id>` */}

        {mode !== 'forgot' && (
          <div className="space-y-1.5">
            <Label htmlFor="auth-pw">
              {isClaim || mode === 'register' ? '设置密码（8-16 位）' : '密码'}
            </Label>
            <input
              id="auth-pw"
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isClaim || mode === 'register' ? 'new-password' : 'current-password'}
              minLength={isClaim || mode === 'register' ? 8 : undefined}
              maxLength={isClaim || mode === 'register' ? 16 : undefined}
              required
            />
          </div>
        )}

        {err && (
          <p className="border-l-2 border-destructive py-1 pl-3 font-mono text-sm text-destructive">
            {err}
          </p>
        )}
        {ok && <p className="border-l-2 border-border py-1 pl-3 font-mono text-sm">{ok}</p>}

        <Button type="submit" disabled={busy} className="w-full">
          {busy
            ? '处理中…'
            : isClaim
              ? '补录并保存'
              : mode === 'forgot'
                ? '发送重置邮件'
                : mode === 'register'
                  ? '注册'
                  : '登录'}
        </Button>
      </form>

      {!isClaim && (
        <>
          <div className="mt-5 border-t border-border pt-4">
            <a
              href={githubStartUrl(
                'login',
                typeof window === 'undefined'
                  ? '/draw'
                  : safeNext(new URLSearchParams(window.location.search).get('next')),
              )}
              className={buttonVariants({ variant: 'outline' }) + ' w-full'}
            >
              <Icon icon="mdi:github" className="mr-2 size-4" />
              用 GitHub 登录
            </a>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 font-mono text-sm">
            {mode !== 'login' && (
              <button type="button" className="underline" onClick={() => switchMode('login')}>
                返回登录
              </button>
            )}
            {mode !== 'register' && (
              <button type="button" className="underline" onClick={() => switchMode('register')}>
                注册新账号
              </button>
            )}
            {mode !== 'forgot' && (
              <button type="button" className="underline" onClick={() => switchMode('forgot')}>
                忘记密码
              </button>
            )}
            <Link to="/draw" className="underline">
              去生图
            </Link>
          </div>
        </>
      )}

      <p className="mt-8 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        为防爆破，登录/注册/找回密码限制为每 10 秒一次。操作被拒时等一会儿再试即可。
        论坛与交互小说因服务器故障暂停服务，账号与生图不受影响。
      </p>
    </main>
  );
}
