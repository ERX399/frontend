'use client';

/**
 * /auth/reset-password —— 找回密码邮件里那条链接的落点
 *
 * 服务端把 token 放在 query（?token=…），有效期 1 小时。这页只负责收新密码
 * 并调 Auth Worker 的 /api/auth/reset-password，成功后引导回登录。
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { resetPassword } from '@/lib/account/api';

const inputCls =
  'w-full border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  // 鉴权口被 Cloudflare WAF 压到 10s 一次：撞了 429 就把重试拦住，
  // 否则用户会连撞几次，还以为是密码填错了
  const [cooldown, setCooldown] = useState(0);

  // token 只能在 effect 里读：服务端没有 window，写进首帧就是水合失配
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErr('');
      if (password !== confirm) {
        setErr('两次输入的密码不一致');
        return;
      }
      setBusy(true);
      try {
        await resetPassword(token, password);
        setDone(true);
      } catch (e: any) {
        setErr(e?.message || '重置失败');
        if (e?.status === 429) setCooldown(10);
      } finally {
        setBusy(false);
      }
    },
    [token, password, confirm],
  );

  if (done) {
    return (
      <main className="container mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-bold">密码已更新</h1>
        <p className="mb-6 font-mono text-sm text-muted-foreground">请用新密码登录。</p>
        {/* Shell UI 的 Button 没有 asChild（不是 Radix），跳转用 Link + buttonVariants */}
        <Link to="/auth" className={buttonVariants()}>
          去登录
        </Link>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-4 border-b border-border pb-3 text-2xl font-bold">设置新密码</h1>

      {!token ? (
        <div className="space-y-4">
          <p className="border-l-2 border-destructive py-1 pl-3 font-mono text-sm text-destructive">
            链接里没有重置令牌，请从邮件中的按钮进入。
          </p>
          <Link to="/auth" className={buttonVariants({ variant: 'outline' })}>
            重新申请
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            {/* 长度上限跟后端一致（8-16），写少了用户会白提交一次、还要再等 10 秒限流 */}
            <Label htmlFor="pw1">新密码（8-16 位）</Label>
            <input
              id="pw1"
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={16}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw2">再输入一次</Label>
            <input
              id="pw2"
              type="password"
              className={inputCls}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={16}
              required
            />
          </div>
          {err && (
            <p className="border-l-2 border-destructive py-1 pl-3 font-mono text-sm text-destructive">
              {err}
            </p>
          )}
          <Button type="submit" disabled={busy || cooldown > 0} className="w-full">
            {busy ? '提交中…' : cooldown > 0 ? `请等 ${cooldown} 秒再提交` : '更新密码'}
          </Button>
        </form>
      )}
    </main>
  );
}
