'use client';

/**
 * /webnovel/admin —— 管理后台（对齐生图）：统计 + 计费口径 + 全站作品管理
 * + 发放创作点 + 站内信。
 *
 * 鉴权用论坛 JWT 的 role==='admin'；非管理员会被后端 403，页面显示无权限。
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  fetchAdminStats,
  fetchAdminOrders,
  givePoints,
  fetchAdminMails,
  createAdminMail,
  archiveAdminMail,
  fetchAdminSettings,
  saveAdminSettings,
  fetchAdminNovels,
  moderateNovel,
  type AdminStats,
  type AdminSettings,
  type AdminNovelRow,
  type MailItem,
  type OrderLedger,
} from '@/lib/webnovel/api/client';
import type { NovelStatus } from '@/lib/webnovel/types';

type State = 'loading' | 'forbidden' | 'ok';

const STATUS_LABEL: Record<NovelStatus, string> = {
  draft: '草稿',
  published: '已发布',
  takedown: '已下架',
};

/** 作品管理里能点的动作。理由会随统一推送（邮件 / QQ）发给作者 */
const MODERATION_ACTIONS: { to: NovelStatus; label: string; from: NovelStatus[] }[] = [
  { to: 'draft', label: '强制转草稿', from: ['published', 'takedown'] },
  { to: 'takedown', label: '下架', from: ['draft', 'published'] },
  { to: 'published', label: '恢复发布', from: ['draft', 'takedown'] },
];

const WINDOW_LABELS: { key: keyof AdminStats['windows']; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: 'yesterday', label: '昨日' },
  { key: 'd7', label: '近 7 天' },
  { key: 'd30', label: '近 30 天' },
];

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-lg">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default function WebnovelAdminPage() {
  const [state, setState] = useState<State>('loading');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [mails, setMails] = useState<(MailItem & { claim_count: number })[]>([]);
  const [ledger, setLedger] = useState<OrderLedger | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // 发放
  const [giveUid, setGiveUid] = useState('');
  const [givePts, setGivePts] = useState('');
  const [giving, setGiving] = useState(false);

  // 站内信
  const [mTitle, setMTitle] = useState('');
  const [mBody, setMBody] = useState('');
  const [mAmount, setMAmount] = useState('');
  const [mMax, setMMax] = useState('');
  const [sending, setSending] = useState(false);

  // 计费口径：draft 是输入框里的字符串，保存时才转数字
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [sDraft, setSDraft] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  // 全站作品
  const [novels, setNovels] = useState<AdminNovelRow[]>([]);
  const [novelTotal, setNovelTotal] = useState(0);
  const [novelPage, setNovelPage] = useState(1);
  const [novelStatus, setNovelStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [novelQuery, setNovelQuery] = useState('');
  const [novelsLoading, setNovelsLoading] = useState(false);
  /** 正在两步确认的处理动作（要填理由） */
  const [pending, setPending] = useState<{ slug: string; to: NovelStatus; label: string } | null>(null);
  const [reason, setReason] = useState('');
  const [moderating, setModerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, m, o, cfg] = await Promise.all([
        fetchAdminStats(),
        fetchAdminMails(),
        fetchAdminOrders(50),
        fetchAdminSettings(),
      ]);
      setStats(s);
      setMails(m.items);
      setLedger(o);
      setSettings(cfg);
      setSDraft(Object.fromEntries(Object.entries(cfg.values).map(([k, v]) => [k, String(v)])));
      setState('ok');
    } catch (e) {
      const status = (e as { status?: number }).status;
      setState(status === 403 || status === 401 ? 'forbidden' : 'ok');
      if (status !== 403 && status !== 401) setError(e instanceof Error ? e.message : '加载失败');
    }
  }, []);

  const loadNovels = useCallback(async () => {
    setNovelsLoading(true);
    try {
      const r = await fetchAdminNovels({ status: novelStatus, q: novelQuery, page: novelPage });
      setNovels(r.items);
      setNovelTotal(r.total);
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status !== 403 && status !== 401) setError(e instanceof Error ? e.message : '作品加载失败');
    } finally {
      setNovelsLoading(false);
    }
  }, [novelStatus, novelQuery, novelPage]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (state === 'ok') void loadNovels();
  }, [state, loadNovels]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    setError(null);
    setNote(null);
    try {
      const patch: Record<string, number> = {};
      for (const f of settings.fields) {
        const n = Number(sDraft[f.key]);
        if (Number.isFinite(n) && n !== settings.values[f.key]) patch[f.key] = n;
      }
      if (Object.keys(patch).length === 0) {
        setNote('没有改动。');
        return;
      }
      const r = await saveAdminSettings(patch);
      setSettings({ ...settings, values: r.values });
      setSDraft(Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, String(v)])));
      setNote('配置已保存，立刻生效（不需要重启后端）。');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleModerate() {
    if (!pending) return;
    setModerating(true);
    setError(null);
    setNote(null);
    try {
      await moderateNovel(pending.slug, pending.to, reason.trim());
      setNote(`已${pending.label}：${pending.slug}。已通过邮件 / QQ 通知作者。`);
      setPending(null);
      setReason('');
      await Promise.all([loadNovels(), load()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setModerating(false);
    }
  }

  async function handleGive(e: React.FormEvent) {
    e.preventDefault();
    setGiving(true);
    setError(null);
    setNote(null);
    try {
      const r = await givePoints(Number(giveUid), Number(givePts));
      setNote(`已给用户 ${r.user_id} 发放 ${r.granted} 创作点，其余额 ${r.balance}。`);
      setGiveUid('');
      setGivePts('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '发放失败');
    } finally {
      setGiving(false);
    }
  }

  async function handleSendMail(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setNote(null);
    try {
      await createAdminMail({
        title: mTitle.trim(),
        body: mBody.trim(),
        amount: Number(mAmount) || 0,
        max_claims: Number(mMax) || 0,
      });
      setNote('站内信已发出，用户在编辑器里可领取。');
      setMTitle('');
      setMBody('');
      setMAmount('');
      setMMax('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setSending(false);
    }
  }

  if (state === 'loading') {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <Spinner className="mx-auto" />
        <p className="mt-3 text-sm text-muted-foreground">加载中…</p>
      </div>
    );
  }

  if (state === 'forbidden') {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <Icon icon="mdi:shield-lock-outline" className="mx-auto size-8" />
        <h2 className="mt-3 text-lg font-semibold">需要管理员权限</h2>
        <p className="mt-1 text-sm text-muted-foreground">用论坛管理员账号登录后再访问本页。</p>
        <Link to="/webnovel" className="mt-4 inline-block text-sm underline">
          返回交互小说
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <header className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link
            to="/webnovel"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <Icon icon="mdi:arrow-left" className="size-4" />
            返回作品列表
          </Link>
          <h1 className="text-xl font-bold">交互小说 · 管理后台</h1>
          <p className="text-sm text-muted-foreground mt-1">统计、发放创作点、站内信</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <Icon icon="mdi:refresh" className="size-4" />
          刷新
        </Button>
      </header>

      {error && (
        <div className="mb-4 border-y border-destructive py-2 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}
      {note && (
        <div className="mb-4 border-y border-border py-2 text-sm text-emerald-600 dark:text-emerald-400">
          {note}
        </div>
      )}

      {stats && (
        <>
          <section className="mb-6">
            <h2 className="text-base font-semibold mb-2">作品</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="总作品" value={stats.novels.total} hint={`作者 ${stats.novels.authors} 人`} />
              <Stat label="已发布" value={stats.novels.published} />
              <Stat label="草稿" value={stats.novels.draft} />
              <Stat label="已下架" value={stats.novels.takedown} />
              <Stat label="总浏览" value={stats.novels.views} />
              <Stat label="总点赞" value={stats.novels.likes} />
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-base font-semibold mb-2">创作点</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="流通中" value={stats.points.circulating} hint={`${stats.points.holders} 个账户`} />
              <Stat label="累计充值到账" value={stats.points.purchased} hint={`${stats.points.orders} 笔订单`} />
              <Stat label="累计消耗" value={stats.points.spent} />
              <Stat
                label="计费口径"
                value={`${stats.points.token_per_point} : 1`}
                hint="tokens : 创作点"
              />
            </div>
          </section>

          {ledger && (
            <section className="mb-6">
              <h2 className="text-base font-semibold mb-2">收入</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label="总收入" value={`¥${ledger.total_revenue}`} hint={`${ledger.total_orders} 笔订单`} />
                <Stat label="单价" value={`¥${ledger.unit_price}`} hint="每份创作点" />
                <Stat label="售出点数" value={ledger.total_points} />
                <Stat
                  label="今日收入"
                  value={`¥${stats.windows.today.revenue ?? 0}`}
                  hint={`${stats.windows.today.orders} 笔`}
                />
              </div>
            </section>
          )}

          <section className="mb-6">
            <h2 className="text-base font-semibold mb-2">分时段</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-t border-border">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">时段</th>
                    <th className="py-2 pr-3">AI 调用</th>
                    <th className="py-2 pr-3">失败</th>
                    <th className="py-2 pr-3">消耗点数</th>
                    <th className="py-2 pr-3">使用人数</th>
                    <th className="py-2 pr-3">新增作品</th>
                    <th className="py-2 pr-3">充值</th>
                    <th className="py-2 pr-3">收入</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {WINDOW_LABELS.map(({ key, label }) => {
                    const w = stats.windows[key];
                    return (
                      <tr key={key} className="border-b border-border">
                        <td className="py-2 pr-3 font-sans">{label}</td>
                        <td className="py-2 pr-3">{w.ai_calls}</td>
                        <td className="py-2 pr-3">{w.ai_failed > 0 ? <span className="text-destructive">{w.ai_failed}</span> : 0}</td>
                        <td className="py-2 pr-3">{w.ai_cost}</td>
                        <td className="py-2 pr-3">{w.ai_users}</td>
                        <td className="py-2 pr-3">{w.novels}</td>
                        <td className="py-2 pr-3">
                          {w.orders} 笔 / {w.order_points} 点
                        </td>
                        <td className="py-2 pr-3">¥{w.revenue ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {stats.top_users.length > 0 && (
            <section className="mb-6">
              <h2 className="text-base font-semibold mb-2">AI 用量 Top（近 30 天）</h2>
              <div className="border-t border-border">
                {stats.top_users.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between border-b border-border py-1.5 text-sm">
                    <span className="font-mono">用户 {u.user_id}</span>
                    <span className="font-mono text-muted-foreground">
                      {u.calls} 次 · {u.cost} 点
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {stats.recent_errors.length > 0 && (
            <section className="mb-6">
              <h2 className="text-base font-semibold mb-2">最近失败</h2>
              <div className="border-t border-border">
                {stats.recent_errors.map((e, i) => (
                  <div key={i} className="border-b border-border py-1.5 text-xs">
                    <span className="font-mono text-muted-foreground">
                      {e.created_at} · 用户 {e.user_id}
                    </span>
                    <p className="text-destructive break-words">{e.error}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* 收入流水明细 */}
      {ledger && ledger.items.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2">收入流水（最近 {ledger.items.length} 笔）</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-t border-border">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">时间</th>
                  <th className="py-2 pr-3">用户</th>
                  <th className="py-2 pr-3">金额</th>
                  <th className="py-2 pr-3">到账点数</th>
                  <th className="py-2 pr-3">订单号</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {ledger.items.map((o) => (
                  <tr key={o.order_id} className="border-b border-border">
                    <td className="py-2 pr-3">{o.created_at}</td>
                    <td className="py-2 pr-3">{o.user_id}</td>
                    <td className="py-2 pr-3">¥{o.revenue}</td>
                    <td className="py-2 pr-3">{o.points}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{o.order_id.slice(0, 16)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 计费口径 */}
      {settings && (
        <section className="mb-6 border-y border-border py-5">
          <h2 className="text-base font-semibold mb-1">计费口径</h2>
          <p className="text-xs text-muted-foreground mb-3">
            存在后端库里，保存后<strong>立刻生效，不重启</strong> —— 重启会把正在跑的 AI 创作任务全判失败。
          </p>
          <form onSubmit={handleSaveSettings} className="grid gap-3">
            {settings.fields.map((f) => (
              <div key={f.key} className="flex items-start gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <label className="text-sm" htmlFor={`set-${f.key}`}>
                    {f.label}
                  </label>
                  <p className="text-xs text-muted-foreground">{f.hint}</p>
                </div>
                <div className="shrink-0">
                  <Input
                    id={`set-${f.key}`}
                    type="number"
                    min={f.min}
                    max={f.max}
                    value={sDraft[f.key] ?? ''}
                    onChange={(e) => setSDraft({ ...sDraft, [f.key]: e.target.value })}
                    className="w-32"
                  />
                  <p className="mt-0.5 text-[11px] text-muted-foreground font-mono">
                    当前 {settings.values[f.key]}
                  </p>
                </div>
              </div>
            ))}
            <div>
              <Button type="submit" size="sm" disabled={savingSettings}>
                {savingSettings ? '保存中…' : '保存配置'}
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* 全站作品管理 */}
      <section className="mb-6">
        <h2 className="text-base font-semibold mb-1">作品管理</h2>
        <p className="text-xs text-muted-foreground mb-3">
          全站作品（含他人草稿与匿名作品的真实作者）。处理结果会通过邮件 / QQ 通知作者。
        </p>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          {[
            { key: '', label: `全部 ${stats?.novels.total ?? ''}` },
            { key: 'published', label: `已发布 ${stats?.novels.published ?? ''}` },
            { key: 'draft', label: `草稿 ${stats?.novels.draft ?? ''}` },
            { key: 'takedown', label: `已下架 ${stats?.novels.takedown ?? ''}` },
          ].map((t) => (
            <Button
              key={t.key || 'all'}
              size="xs"
              variant={novelStatus === t.key ? 'default' : 'outline'}
              onClick={() => {
                setNovelStatus(t.key);
                setNovelPage(1);
              }}
            >
              {t.label}
            </Button>
          ))}
          <form
            className="flex items-center gap-2 ml-auto"
            onSubmit={(e) => {
              e.preventDefault();
              setNovelQuery(searchInput.trim());
              setNovelPage(1);
            }}
          >
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="标题 / slug / 作者"
              aria-label="搜索作品"
              className="w-44"
            />
            <Button type="submit" size="xs" variant="outline">
              搜索
            </Button>
          </form>
        </div>

        {novelsLoading ? (
          <div className="py-6 text-center">
            <Spinner className="mx-auto" />
          </div>
        ) : novels.length === 0 ? (
          <p className="text-sm text-muted-foreground border-y border-border py-4">没有符合条件的作品。</p>
        ) : (
          <div className="border-t border-border">
            {novels.map((n) => (
              <div key={n.id} className="border-b border-border py-2.5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/webnovel/${n.slug}`}
                        className="font-semibold text-sm hover:underline break-all"
                      >
                        {n.title}
                      </Link>
                      <span className="text-[11px] bg-secondary text-secondary-foreground px-1.5 shrink-0">
                        {STATUS_LABEL[n.status]}
                      </span>
                      {!!n.anonymous && (
                        <span className="text-[11px] text-muted-foreground shrink-0">匿名发布</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5 break-all">
                      /{n.slug} · 作者 #{n.author_id}
                      {n.author_name ? ` ${n.author_name}` : ''} · 浏览 {n.view_count} · 赞 {n.like_count} ·
                      评论 {n.comment_count} · 更新 {n.updated_at}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    {MODERATION_ACTIONS.filter((a) => a.from.includes(n.status)).map((a) => (
                      <Button
                        key={a.to}
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setPending({ slug: n.slug, to: a.to, label: a.label });
                          setReason('');
                        }}
                      >
                        {a.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 两步确认：填理由再执行，理由随通知发给作者 */}
                {pending?.slug === n.slug && (
                  <div className="mt-2 border border-border p-2">
                    <p className="text-xs mb-1.5">
                      确认{pending.label}《{n.title}》？作者会收到邮件 / QQ 通知。
                    </p>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="理由（会写进通知，可空）"
                      aria-label="处理理由"
                      className="mb-2"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="xs" disabled={moderating} onClick={() => void handleModerate()}>
                        {moderating ? '处理中…' : `确认${pending.label}`}
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => setPending(null)}>
                        取消
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {novelTotal > 20 && (
          <div className="mt-3 flex items-center justify-between gap-2 text-sm">
            <Button
              size="xs"
              variant="outline"
              disabled={novelPage <= 1}
              onClick={() => setNovelPage((p) => Math.max(1, p - 1))}
            >
              上一页
            </Button>
            <span className="font-mono text-xs text-muted-foreground">
              {novelPage} / {Math.ceil(novelTotal / 20)} 页 · 共 {novelTotal}
            </span>
            <Button
              size="xs"
              variant="outline"
              disabled={novelPage >= Math.ceil(novelTotal / 20)}
              onClick={() => setNovelPage((p) => p + 1)}
            >
              下一页
            </Button>
          </div>
        )}
      </section>

      {/* 发放创作点 */}
      <section className="mb-6 border-y border-border py-5">
        <h2 className="text-base font-semibold mb-1">发放创作点</h2>
        <p className="text-xs text-muted-foreground mb-3">
          只能发给<strong>指定用户</strong>。全服发放请用下面的站内信 —— 用户主动领取，可追溯谁领了。
        </p>
        <form onSubmit={handleGive} className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="text-xs text-muted-foreground" htmlFor="give-uid">论坛用户 ID</label>
            <Input
              id="give-uid"
              type="number"
              value={giveUid}
              onChange={(e) => setGiveUid(e.target.value)}
              className="mt-1 w-32"
              required
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground" htmlFor="give-pts">创作点</label>
            <Input
              id="give-pts"
              type="number"
              value={givePts}
              onChange={(e) => setGivePts(e.target.value)}
              className="mt-1 w-32"
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={giving || !giveUid || !givePts}>
            {giving ? '发放中…' : '发放'}
          </Button>
        </form>
      </section>

      {/* 站内信 */}
      <section className="border-y border-border py-5">
        <h2 className="text-base font-semibold mb-3">站内信（全服）</h2>
        <form onSubmit={handleSendMail} className="grid gap-2 mb-4">
          <Input value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="标题" aria-label="邮件标题" required />
          <Textarea value={mBody} onChange={(e) => setMBody(e.target.value)} rows={2} placeholder="正文（可空）" aria-label="邮件正文" />
          <div className="flex items-end gap-2 flex-wrap">
            <div>
              <label className="text-xs text-muted-foreground" htmlFor="mail-amount">附带创作点（0 = 纯通知）</label>
              <Input
                id="mail-amount"
                type="number"
                value={mAmount}
                onChange={(e) => setMAmount(e.target.value)}
                className="mt-1 w-32"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground" htmlFor="mail-max">限领人数（0 = 不限）</label>
              <Input
                id="mail-max"
                type="number"
                value={mMax}
                onChange={(e) => setMMax(e.target.value)}
                placeholder="如 100"
                className="mt-1 w-32"
              />
            </div>
            <Button type="submit" size="sm" disabled={sending || !mTitle.trim()}>
              {sending ? '发送中…' : '发送'}
            </Button>
          </div>
        </form>

        {mails.length === 0 ? (
          <p className="text-sm text-muted-foreground">还没有站内信。</p>
        ) : (
          <div className="border-t border-border">
            {mails.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-3 border-b border-border py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{m.title}</span>
                    {m.amount > 0 && (
                      <span className="text-[11px] bg-secondary text-secondary-foreground px-1.5">+{m.amount} 点</span>
                    )}
                    {m.status === 'archived' && (
                      <span className="text-[11px] text-muted-foreground">已归档</span>
                    )}
                  </div>
                  {m.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{m.body}</p>}
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                    {m.claim_count}
                    {m.max_claims ? ` / ${m.max_claims}` : ''} 人已领
                    {m.max_claims && m.claim_count >= m.max_claims ? '（已抢完）' : ''} ·{' '}
                    {new Date(m.created_at * 1000).toLocaleString('zh-CN')}
                  </p>
                </div>
                {m.status !== 'archived' && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={async () => {
                      await archiveAdminMail(m.id);
                      await load();
                    }}
                  >
                    归档
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
