'use client';

/**
 * 阅读器运行时 hook（客户端）。
 *
 * 把 NovelRuntime 状态机 + 同步计时器 + localStorage 断点续读组装成
 * 一个可直接渲染的 view：页面累积内容（image/say）、计时闸门（normal/
 * secret/hidden）、出口（choice/goto/end）、条件过滤+锁定的选项。
 *
 * 读/预览/测试三处共用本 hook（预览/测试由编辑器传入 source 变体，此处
 * 默认从后端拉取作品）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchNovel } from '../api/client';
import { NovelRuntime, type RuntimeState } from './runtime';
import type { ChoiceOption, Novel, NovelVariable, TimerStyle } from '../types';

/** 背包里的一件道具 */
export interface InventoryItem {
  name: string;
  label: string;
  description?: string;
  /** 数值型道具显示数量（如电量 60），布尔型为 null */
  quantity: number | null;
}

/** 玩家是否"持有"某状态：布尔 true / 数字 >0 / 非空字符串 */
function owned(v: string | number | boolean | undefined): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v > 0;
  if (typeof v === 'string') return v.trim() !== '' && v !== 'false';
  return false;
}

function toItem(decl: NovelVariable, value: string | number | boolean | undefined): InventoryItem {
  return {
    name: decl.name,
    label: decl.label?.trim() || decl.name,
    description: decl.description,
    quantity: decl.type === 'number' ? Number(value) || 0 : null,
  };
}

const KEY = (slug: string) => `webnovel:${slug}`;

export interface RenderedOption {
  opt: ChoiceOption;
  locked: boolean;
  lockLabel?: string;
  /** 该选项所属的 choice 动作（同页可能有多个 choice 块，选中时要按它回溯） */
  choiceActionId: string;
}

export interface TimerInfo {
  total: number;
  remaining: number;
  style: TimerStyle;
  /** 倒计时结束自动执行出口（goto/end），不显示「继续」按钮 */
  autoAdvance: boolean;
}

export interface NovelView {
  pageId: string;
  title: string;
  images: string[];
  texts: { text: string; align?: string }[];
  timer: TimerInfo | null;
  outletReady: boolean;
  outletKind: 'choice' | 'goto' | 'end' | 'none';
  /** 计时结束后是否自动执行出口（仅 goto/end 有效；choice 仍需玩家选） */
  autoAdvance: boolean;
  choiceActionId: string | null;
  gotoTarget: string | null;
  options: RenderedOption[];
  variables: Record<string, string | number | boolean>;
  /** 背包：玩家当前持有的道具（kind==='item' 且值为"持有"） */
  inventory: InventoryItem[];
  totalPages: number;
  visitedCount: number;
}

export function useNovelRuntime(slug: string) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'missing'>('loading');
  const [novel, setNovel] = useState<Novel | null>(null);
  const [runtime, setRuntime] = useState<NovelRuntime | null>(null);
  const [state, setState] = useState<RuntimeState | null>(null);
  const [timer, setTimer] = useState<TimerInfo | null>(null);
  const [outletReady, setOutletReady] = useState(false);
  const hydrated = useRef(false);
  /** 刚获得的道具（用于弹提示）；显示完由 UI 调 dismissAcquired 清掉 */
  const [acquired, setAcquired] = useState<InventoryItem[]>([]);
  const prevOwned = useRef<Set<string> | null>(null);

  // 加载作品 + 恢复存档。`?preview=<token>` 是编辑器给作者的预览链接，
  // 带上它后端才会返回未发布作品（游客拿同一地址是 404）。
  useEffect(() => {
    let cancelled = false;
    // 预览未发布作品要带作者身份：优先用 URL 上的 ?preview=，没有就退回本机登录态。
    // 早期只认 URL 参数，链接里 token 为空时作者自己也打不开（表现为 404）。
    let previewToken: string | undefined;
    try {
      previewToken =
        new URLSearchParams(window.location.search).get('preview') ||
        localStorage.getItem('forum-auth-token') ||
        undefined;
    } catch {}
    fetchNovel(slug, previewToken)
      .then((n) => {
        if (cancelled) return;
        const rt = new NovelRuntime(n.source || { startPage: '', variables: [], pages: [] });
        let saved: Partial<RuntimeState> | null = null;
        try {
          const raw = localStorage.getItem(KEY(n.slug));
          if (raw) saved = JSON.parse(raw) as Partial<RuntimeState>;
        } catch {}
        const st = saved ? rt.restore(saved) : rt.init();
        hydrated.current = true;
        setNovel(n);
        setRuntime(rt);
        setState(st);
        setStatus('ok');
      })
      .catch(() => {
        if (!cancelled) setStatus('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // 每步持久化（断点续读）
  useEffect(() => {
    if (!novel || !state || !hydrated.current) return;
    try {
      localStorage.setItem(KEY(novel.slug), JSON.stringify(state));
    } catch {}
  }, [novel, state]);

  /**
   * 道具获得提示：对比前后两次「持有集合」，新增的弹出来。
   *
   * 玩家实测反馈：拿到钥匙、通了关，却完全不知道自己做对了什么 —— 因为状态
   * 全在暗处。凡是 kind==='item' 的，获得那一刻必须让玩家看见。
   */
  useEffect(() => {
    const decls = novel?.source?.variables || [];
    if (!state || decls.length === 0) return;
    const now = new Set(
      decls.filter((v) => v.kind === 'item' && owned(state.variables[v.name])).map((v) => v.name),
    );
    const before = prevOwned.current;
    prevOwned.current = now;
    if (!before) return; // 首次（含读档恢复）不弹，避免一进来就刷一屏
    const fresh = [...now].filter((n) => !before.has(n));
    if (fresh.length === 0) return;
    setAcquired((prev) => [
      ...prev,
      ...fresh.map((n) => toItem(decls.find((v) => v.name === n)!, state.variables[n])),
    ]);
  }, [state, novel]);

  const dismissAcquired = useCallback(() => setAcquired([]), []);

  // 同步计时器闸门：进入新页时按 duration 计算总时长，倒计时结束解锁出口
  useEffect(() => {
    if (!runtime || !state) return;
    const page = runtime.getPage(state.pageId);
    if (!page) {
      setTimer(null);
      setOutletReady(true);
      return;
    }
    const t = runtime.getTimerAction(page);
    if (!t) {
      setTimer(null);
      setOutletReady(true);
      return;
    }
    const d = t.duration;
    let total: number;
    if (d.mode === 'specific') {
      total = Math.max(1, Math.round(d.seconds || 0));
    } else {
      const min = Math.max(1, Math.round(d.min || 1));
      const max = Math.max(min, Math.round(d.max || min));
      total = min + Math.round(Math.random() * (max - min));
    }
    const auto = !!t.autoAdvance;
    setTimer({ total, remaining: total, style: t.style, autoAdvance: auto });
    setOutletReady(false);
    const started = Date.now();
    const iv = setInterval(() => {
      const elapsed = (Date.now() - started) / 1000;
      if (elapsed >= total) {
        clearInterval(iv);
        setTimer({ total, remaining: 0, style: t.style, autoAdvance: auto });
        setOutletReady(true);
      } else {
        setTimer((prev) => (prev ? { ...prev, remaining: Math.max(0, total - elapsed) } : prev));
      }
    }, 200);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, state?.pageId]);

  const view: NovelView | null = useMemo(() => {
    if (!runtime || !state) return null;
    const page = runtime.getPage(state.pageId);
    if (!page) return null;

    const images: string[] = [];
    const texts: { text: string; align?: string }[] = [];
    for (const a of page.actions) {
      if (a.disabled) continue;
      if (a.type === 'image' && a.image) images.push(a.image);
      if (a.type === 'say' && a.text) texts.push({ text: a.text, align: a.align });
    }

    const outlet = runtime.getOutlet(page);
    let options: RenderedOption[] = [];
    let gotoTarget: string | null = null;
    let choiceActionId: string | null = null;
    if (outlet.kind === 'choice') {
      choiceActionId = outlet.choiceActionIds[0] ?? null;
      // 合并本页所有 choice 块的选项：作者常把不同分支拆成几个 choice
      for (const actionId of outlet.choiceActionIds) {
        const choice = page.actions.find((a) => a.id === actionId);
        if (!choice || choice.type !== 'choice') continue;
        for (const o of choice.options) {
          if (!runtime.isOptionVisible(o, state)) continue;
          options.push({ opt: o, choiceActionId: actionId, ...runtime.isOptionLocked(o, state) });
        }
      }
    }
    if (outlet.kind === 'goto') gotoTarget = outlet.target;

    const inventory = (novel?.source?.variables || [])
      .filter((v) => v.kind === 'item' && owned(state.variables[v.name]))
      .map((v) => toItem(v, state.variables[v.name]));

    return {
      pageId: state.pageId,
      title: page.title || '',
      images,
      texts,
      inventory,
      timer,
      outletReady,
      outletKind: outlet.kind,
      autoAdvance: !!timer?.autoAdvance,
      choiceActionId,
      gotoTarget,
      options,
      variables: state.variables,
      totalPages: runtime.pages.length,
      visitedCount: state.visited.length,
    };
  }, [runtime, state, timer, outletReady, novel]);

  const pickOption = useCallback(
    (choiceActionId: string, optionId: string) => {
      if (!runtime || !state) return;
      setState(runtime.pickOption(state, choiceActionId, optionId));
    },
    [runtime, state],
  );

  const continueGoto = useCallback(
    (target: string) => {
      if (!runtime || !state) return;
      setState(runtime.continueGoto(state, target));
    },
    [runtime, state],
  );

  const restart = useCallback(() => {
    if (!runtime) return;
    try {
      localStorage.removeItem(KEY(slug));
    } catch {}
    setState(runtime.init());
  }, [runtime, slug]);

  return { status, novel, view, pickOption, continueGoto, restart, acquired, dismissAcquired };
}
