'use client';

/**
 * AI 创作面板：输入需求 → DeepSeek 生成整部作品 → 直接建成草稿。
 *
 * 计费用「创作点」（爱发电充值，与生图点是两套独立货币）。
 * 服务端先扣点再调模型，失败会自动退款。
 */
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import {
  fetchWallet,
  syncWallet,
  submitAiGeneration,
  followAiJob,
  fetchAiJobs,
  fetchMails,
  claimMail,
  type WalletInfo,
  type AiJob,
  type MailItem,
} from '@/lib/webnovel/api/client';

const EXAMPLES = [
  '一个雨夜的废弃医院探险故事，要有手电筒电量的设定，电量耗尽会触发坏结局',
  '赛博朋克风格：玩家是黑客，要在警察追踪到之前完成入侵，有倒计时压力',
  '古宅悬疑：找到三把钥匙才能打开最终的门，每把钥匙藏在不同分支里',
];

export function AiCreatePanel({
  userId,
  authorName,
  onCreated,
}: {
  userId?: number;
  /** 论坛用户名，随创作请求带给后端（JWT 里没有 name，漏传作品会显示「匿名」） */
  authorName?: string;
  /** 作品已由后端建好，这里只需刷新「我的作品」列表 */
  onCreated: () => Promise<void> | void;
}) {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [requirement, setRequirement] = useState('');
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stream, setStream] = useState('');
  const [thinking, setThinking] = useState('');
  /** 后端推来的阶段提示（构思大纲 / 写第 N 批 / 定点修复），常驻显示 */
  const [phase, setPhase] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [mails, setMails] = useState<MailItem[]>([]);
  const [unclaimed, setUnclaimed] = useState(0);
  const [mailOpen, setMailOpen] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);

  const loadWallet = useCallback(async () => {
    try {
      setWallet(await fetchWallet());
    } catch {
      // 未登录/后端未就绪时不打断编辑器其它功能
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const r = await fetchAiJobs(8);
      setJobs(r.jobs);
    } catch {}
  }, []);

  const loadMails = useCallback(async () => {
    try {
      const m = await fetchMails();
      setMails(m.items);
      setUnclaimed(m.unclaimed_count);
    } catch {}
  }, []);

  useEffect(() => {
    void loadWallet();
    void loadMails();
    void loadJobs();
  }, [loadWallet, loadMails, loadJobs]);

  /**
   * 有进行中的任务时轮询刷新 —— 覆盖"上次没等完就关了页面、这次回来看进度"的情况。
   * 任务本身在后端跑，这里只是把最新状态取回来。
   */
  useEffect(() => {
    if (!jobs.some((j) => j.status === 'pending')) return;
    const t = setInterval(() => {
      void loadJobs();
      void loadWallet();
    }, 8000);
    return () => clearInterval(t);
  }, [jobs, loadJobs, loadWallet]);

  async function handleClaim(id: number) {
    setClaiming(id);
    setError(null);
    try {
      const r = await claimMail(id);
      setWallet((w) => (w ? { ...w, balance: r.balance } : w));
      setNote(r.amount > 0 ? `已领取 ${r.amount} 创作点，余额 ${r.balance}。` : '已读。');
      await loadMails();
    } catch (e) {
      setError(e instanceof Error ? e.message : '领取失败');
    } finally {
      setClaiming(null);
    }
  }

  /**
   * 发起创作后**立即返回** —— 任务在后端跑、结果直接落库。
   * 用户可以马上关页面，回来在「我的作品」里看结果。
   * 留在页面上的话，下面会实时显示模型输出（纯锦上添花，断了也不影响）。
   */
  async function handleGenerate() {
    const req = requirement.trim();
    if (!req) return;
    setBusy(true);
    setElapsed(0);
    setStream('');
    setThinking('');
    setPhase('');
    setError(null);
    setNote(null);
    let jobId = '';
    try {
      const sub = await submitAiGeneration(req, authorName);
      jobId = sub.job_id;
      setRequirement('');
      setNote('已开始创作，可以关闭页面了 —— 完成后作品会自动出现在「我的作品」里。');
      void loadJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : '发起失败');
      setBusy(false);
      void loadWallet();
      return;
    }

    // 还在页面上就跟一下进度（失败/断开都无所谓，任务照跑）
    try {
      const r = await followAiJob(jobId, {
        onTick: setElapsed,
        onDelta: (text, kind) => {
          // 只留尾部：整篇 JSON 可能上万字，全量渲染会拖垮页面
          if (kind === 'content') setStream((s) => (s + text).slice(-4000));
          else if (text.includes('[系统]')) {
            // 后端分段管道会推「大纲/写第 N 批/修复」等阶段提示 —— 它比原始
            // 推理文字有用得多，单独拎出来常驻显示，别混在 thinking 里被 stream 顶掉
            setPhase(text.replace(/\s*\[系统\]\s*/, '').trim());
          } else setThinking((s) => (s + text).slice(-2000));
        },
      });
      if (r.status === 'done') {
        setWallet((w) => (w ? { ...w, balance: r.balance } : w));
        setNote(`《${r.title}》已创作完成并存为草稿：${r.tokens} tokens，扣 ${r.cost} 创作点。`);
        await onCreated();
      } else if (r.status === 'error') {
        setError(r.error || '创作失败（未扣费）');
      } else {
        setNote('仍在创作中，可以关闭页面，稍后回来查看。');
      }
    } catch {
      setNote('已在后台继续创作，稍后回来查看「我的作品」。');
    } finally {
      setBusy(false);
      void loadJobs();
      void loadWallet();
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const r = await syncWallet();
      setWallet((w) => (w ? { ...w, balance: r.balance, total_purchased: r.total_purchased } : w));
      setNote(`已同步，当前余额 ${r.balance} 创作点。`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '同步失败');
    } finally {
      setSyncing(false);
    }
  }

  // 购买链接里的 remark 必须是本人用户 id —— 爱发电订单靠它认领
  const rechargeUrl = wallet?.recharge_url
    ? userId
      ? wallet.recharge_url.replace('remark=1', `remark=${userId}`)
      : wallet.recharge_url
    : '';

  const tokenPerPoint = wallet?.token_per_point ?? 200;
  const minBalance = wallet?.min_balance ?? 20;
  const enough = (wallet?.balance ?? 0) >= minBalance;

  return (
    <section className="border-y border-border py-5 mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-base font-semibold inline-flex items-center gap-1.5">
          <Icon icon="mdi:robot-outline" className="size-4" />
          AI 创作
        </h2>
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span className="font-mono">
            创作点 {wallet ? wallet.balance : '…'}
            <span className="ml-1 opacity-70">（按 token 计费：{tokenPerPoint} tokens = 1 点）</span>
          </span>
          {rechargeUrl && (
            <a
              href={rechargeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-6 items-center gap-1 border border-border px-2 hover:border-foreground"
            >
              <Icon icon="mdi:cart-outline" className="size-3.5" />
              充值{wallet?.per_sku ? `（${wallet.per_sku} 点/份）` : ''}
            </a>
          )}
          <Button variant="ghost" size="xs" onClick={handleSync} disabled={syncing}>
            {syncing ? '同步中…' : '已支付，刷新余额'}
          </Button>
          <Button
            variant={unclaimed > 0 ? 'outline' : 'ghost'}
            size="xs"
            onClick={() => setMailOpen((v) => !v)}
            aria-pressed={mailOpen}
          >
            <Icon icon="mdi:email-outline" className="size-3.5" />
            站内信{unclaimed > 0 ? `（${unclaimed}）` : ''}
          </Button>
        </div>
      </div>

      {mailOpen && (
        <div className="mb-3 border border-border p-2">
          {mails.length === 0 ? (
            <p className="text-xs text-muted-foreground">暂无站内信。</p>
          ) : (
            <div className="space-y-1.5">
              {mails.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-2 border-b border-border pb-1.5 last:border-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{m.title}</span>
                      {m.amount > 0 && (
                        <span className="text-[11px] bg-secondary text-secondary-foreground px-1.5">
                          +{m.amount} 点
                        </span>
                      )}
                      {typeof m.remaining === 'number' && (
                        <span
                          className={`text-[11px] px-1.5 ${
                            m.remaining > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {m.remaining > 0 ? `仅剩 ${m.remaining} 个名额` : '名额已抢完'}
                        </span>
                      )}
                    </div>
                    {m.body && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{m.body}</p>}
                  </div>
                  {m.claimed ? (
                    <span className="text-[11px] text-muted-foreground shrink-0">已领取</span>
                  ) : m.sold_out ? (
                    <span className="text-[11px] text-muted-foreground shrink-0">已抢完</span>
                  ) : (
                    <Button size="xs" disabled={claiming === m.id} onClick={() => handleClaim(m.id)}>
                      {claiming === m.id ? '领取中…' : m.amount > 0 ? '领取' : '知道了'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground mb-2">
        描述你想要的故事，AI 会生成完整的分支剧情（含变量、条件选项、多结局），直接存为草稿，之后可自由编辑。
      </p>

      <Textarea
        value={requirement}
        onChange={(e) => setRequirement(e.target.value)}
        rows={3}
        placeholder="例如：一个雨夜的废弃医院探险，手电筒有电量限制，耗尽会触发坏结局…"
        aria-label="AI 创作需求"
        disabled={busy}
      />

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={handleGenerate} disabled={busy || !requirement.trim()}>
          {busy ? (
            <>
              <Spinner className="size-4" />
              生成中 {elapsed}s（通常 1~3 分钟）…
            </>
          ) : (
            <>
              <Icon icon="mdi:creation" className="size-4" />
              生成作品
            </>
          )}
        </Button>
        {!enough && wallet && (
          <span className="text-xs text-destructive">创作点不足（至少 {minBalance}），请先充值。</span>
        )}
      </div>

      {/* 创作任务：进行中的即使关了页面也在跑，回来在这里看进度 */}
      {jobs.length > 0 && (
        <div className="mt-3 border border-border">
          <div className="flex items-center gap-2 border-b border-border px-2 py-1 text-[11px] text-muted-foreground">
            <Icon icon="mdi:format-list-checks" className="size-3.5" />
            创作任务（后台运行，可关闭页面）
          </div>
          <ul>
            {jobs.map((j) => (
              <li key={j.id} className="flex items-start justify-between gap-2 border-b border-border px-2 py-1.5 text-xs last:border-0">
                <div className="min-w-0">
                  <span className="mr-1.5 text-muted-foreground">
                    {j.kind === 'refine' ? '修改' : '创作'}
                  </span>
                  {j.status === 'pending' && <span className="text-amber-600 dark:text-amber-400">进行中…</span>}
                  {j.status === 'done' && (
                    <>
                      <span className="text-emerald-600 dark:text-emerald-400">已完成</span>
                      {j.title && <b className="ml-1.5">《{j.title}》</b>}
                      <span className="ml-1.5 font-mono text-muted-foreground">
                        {j.tokens} tokens · 扣 {j.cost}
                      </span>
                    </>
                  )}
                  {j.status === 'error' && <span className="text-destructive">失败：{j.error}</span>}
                  <p className="truncate text-muted-foreground">{j.prompt}</p>
                </div>
                {j.status === 'done' && j.slug && (
                  <a
                    href={`/webnovel/play/${j.slug}?preview=${encodeURIComponent(
                      (typeof window !== 'undefined' && localStorage.getItem('forum-auth-token')) || '',
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 border border-border px-1.5 py-0.5 hover:border-foreground"
                  >
                    预览
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 生成中：直接把模型输出摊出来，别让人对着转圈干等 */}
      {busy && (stream || thinking || phase) && (
        <div className="mt-2 border border-border">
          <div className="flex items-center gap-2 border-b border-border px-2 py-1 text-[11px] text-muted-foreground">
            <Icon icon="mdi:script-text-outline" className="size-3.5" />
            模型输出（实时）
          </div>
          {phase && (
            <div className="flex items-start gap-1.5 border-b border-border px-2 py-1.5 text-[11px]">
              <Spinner className="size-3 shrink-0 translate-y-0.5" />
              <span className="min-w-0">{phase}</span>
            </div>
          )}
          {thinking && !stream && (
            <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap break-all px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground italic">
              {thinking}
            </pre>
          )}
          {stream && (
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-all px-2 py-1.5 font-mono text-[11px] leading-relaxed">
              {stream}
            </pre>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setRequirement(ex)}
            disabled={busy}
            className="border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {ex.slice(0, 18)}…
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {note && <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{note}</p>}
    </section>
  );
}
