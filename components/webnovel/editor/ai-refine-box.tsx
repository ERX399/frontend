'use client';

/**
 * AI 增量修改：对**已保存的作品**提要求，AI 在现有内容上改写。
 *
 * 作品从库里读，所以随时能回来接着改、改多少轮都行 —— 不依赖任何会话状态。
 * 按 token 计费（与生成同一口径），失败不扣费。
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { submitAiRefine, followAiJob } from '@/lib/webnovel/api/client';

const QUICK = [
  '把第一页的氛围写得更压抑一些',
  '多加一个隐藏结局，需要集齐所有道具才能进入',
  '给每个关键选择加上倒计时压力',
  '把所有正文改得更简洁，去掉冗长描写',
];

export function AiRefineBox({
  slug,
  onRefined,
}: {
  slug: string;
  /** 改写已由后端写回作品，这里只需刷新编辑器拿到新内容 */
  onRefined: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stream, setStream] = useState('');
  /** 后端推来的阶段提示，常驻显示 */
  const [phase, setPhase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function handleRefine() {
    const ins = instruction.trim();
    if (!ins) return;
    setBusy(true);
    setElapsed(0);
    setStream('');
    setPhase('');
    setError(null);
    setNote(null);
    let jobId = '';
    try {
      const sub = await submitAiRefine(slug, ins);
      jobId = sub.job_id;
      setInstruction('');
      setNote('已开始修改，可以关闭页面 —— 改好后直接写回这部作品。');
    } catch (e) {
      setError(e instanceof Error ? e.message : '发起失败');
      setBusy(false);
      return;
    }

    // 留在页面上就跟一下进度；断开也没关系，任务在后端跑、结果直接落库
    try {
      const r = await followAiJob(jobId, {
        onTick: setElapsed,
        onDelta: (text, kind) => {
          if (kind === 'content') setStream((s) => (s + text).slice(-4000));
          // 后端的阶段提示（改写 / 定点修复）常驻显示，别只给一个转圈
          else if (text.includes('[系统]')) setPhase(text.replace(/\s*\[系统\]\s*/, '').trim());
        },
      });
      if (r.status === 'done') {
        setNote(`已按要求改写：${r.tokens} tokens，扣 ${r.cost} 创作点，余额 ${r.balance}。`);
        await onRefined();
      } else if (r.status === 'error') {
        setError(r.error || '修改失败（未扣费）');
      } else {
        setNote('仍在修改中，可以关闭页面，稍后回来刷新查看。');
      }
    } catch {
      setNote('已在后台继续修改，稍后回来刷新查看。');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="xs" onClick={() => setOpen(true)}>
        <Icon icon="mdi:auto-fix" className="size-3.5" />
        AI 修改
      </Button>
    );
  }

  return (
    <div className="mt-3 border border-border p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold inline-flex items-center gap-1.5">
          <Icon icon="mdi:auto-fix" className="size-4" />
          AI 修改（在现有内容上改，可反复改）
        </h4>
        <Button variant="ghost" size="icon-xs" onClick={() => setOpen(false)} aria-label="收起 AI 修改">
          <Icon icon="mdi:close" className="size-3.5" />
        </Button>
      </div>

      <Textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        rows={2}
        placeholder="想改什么？例如：把结局改得更黑暗；给走廊那页加一个 10 秒倒计时；多加一条分支线…"
        aria-label="AI 修改要求"
        disabled={busy}
      />

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={handleRefine} disabled={busy || !instruction.trim()}>
          {busy ? (
            <>
              <Spinner className="size-4" />
              修改中 {elapsed}s…
            </>
          ) : (
            <>
              <Icon icon="mdi:pencil" className="size-4" />
              按要求修改
            </>
          )}
        </Button>
        <span className="text-[11px] text-muted-foreground">按 token 计费，失败不扣费</span>
      </div>

      {busy && (stream || phase) && (
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
          {stream && (
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-all px-2 py-1.5 font-mono text-[11px] leading-relaxed">
              {stream}
            </pre>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setInstruction(q)}
            disabled={busy}
            className="border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {q.slice(0, 14)}…
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {note && <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{note}</p>}
    </div>
  );
}
