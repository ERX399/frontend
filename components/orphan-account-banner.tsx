'use client';

/**
 * 孤儿账号提示条（2026-08-07 起，故障恢复期专用）
 *
 * D1 的备份时间点早于 731 个用户的注册时间，他们在 accounts.db 里没有行，
 * 但生图库按 user_id 记着余额与作品。这些人现在还能正常用（JWT 只验签），
 * 可一旦退出登录或换设备就再也进不来了 —— 所以必须在他们还登录着的时候，
 * 主动把「补录邮箱」这件事摆到眼前。
 *
 * 三条克制的原则：
 *   1. 只对真正的孤儿账号显示。判据是「本地 token 未过期，但服务端说不认识你」
 *      —— 那批人的签名是有效的（JWT_SECRET 从没变过），只是 users 表里没有他们
 *      的行，服务端 authenticate 查不到就 401。这是现在唯一能识别他们的信号：
 *      /api/user/me 已随论坛业务一起删除，没有 orphan 标记可读了。
 *   2. 未登录、正常账号、请求失败，一律不显示（宁可漏提示，不可误伤）。
 *   3. 可关闭，但只记在 sessionStorage —— 关了本次不再烦，下次打开还会提醒，
 *      因为这件事不做完，账号迟早会丢。
 */
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { accountState, decodeToken, isTokenValid } from '@/lib/account/api';

const DISMISS_KEY = 'orphan-banner-dismissed';

export function OrphanAccountBanner() {
  const [show, setShow] = useState(false);
  const [uid, setUid] = useState<number | null>(null);
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isTokenValid()) return;
      try {
        if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
      } catch {
        /* 隐私模式读不了就当没关过 */
      }
      try {
        await accountState();
        /* 拿得到状态 = 账号正常，不提示 */
      } catch (e: any) {
        // 只认 401。网络错、429（WAF 限流）、5xx 都不提示 —— 宁可漏一次，
        // 也不能对正常账号弹「你的账号资料缺失」。
        if (alive && e?.status === 401) {
          setUid(decodeToken()?.id ?? null);
          setShow(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 已经在补录页了就不必再挂一条横幅
  if (!show || location.pathname === '/auth') return null;

  return (
    <div className="border-b border-border bg-muted/40">
      <div className="container mx-auto flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 text-sm">
        <Icon icon="mdi:alert" className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          你的账号资料在服务器故障中缺失（UID {uid}），
          <strong className="font-medium">余额和作品都还在</strong>
          。请趁当前登录状态补录邮箱，否则退出后将无法找回。
        </span>
        <Link
          to="/auth"
          className="shrink-0 border border-foreground px-3 py-1 font-mono text-xs hover:bg-foreground hover:text-background"
        >
          立即补录
        </Link>
        <button
          type="button"
          aria-label="本次不再提示"
          className="shrink-0 px-1 text-muted-foreground hover:text-foreground"
          onClick={() => {
            try {
              sessionStorage.setItem(DISMISS_KEY, '1');
            } catch {
              /* 忽略 */
            }
            setShow(false);
          }}
        >
          <Icon icon="mdi:close" className="size-4" />
        </button>
      </div>
    </div>
  );
}
