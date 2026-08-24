/**
 * 阅读器运行时（状态机）。读/预览/测试共用。
 *
 * 语义：作品 = 页面列表。进入页面立即执行所有 `set` 动作并记 visited；
 * 页面的 `image`/`say` 累积成内容；同步 `timer` 作出口闸门（由 hook 驱动）；
 * 出口 = 页面上第一个 choice / goto / end。选择 choice 选项执行该选项的
 * set 动作并 goto 目标页。默认不可回退（选择即后果）。
 *
 * 本类只管状态转移，不碰 DOM/计时器（那属于 useNovelRuntime）。
 * state 可 JSON 序列化存 localStorage（断点续读）。
 */
import type { Action, ChoiceOption, NovelPage, NovelSource, NovelVariable } from '../types';
import { evalCondition, type ConditionContext } from './conditions';

export interface RuntimeState {
  pageId: string;
  variables: Record<string, string | number | boolean>;
  visited: string[];
  chosen: string[];
}

export type Outlet =
  | { kind: 'choice'; pageId: string; choiceActionIds: string[] }
  | { kind: 'goto'; pageId: string; target: string }
  | { kind: 'end'; pageId: string }
  | { kind: 'none'; pageId: string };

export class NovelRuntime {
  constructor(readonly source: NovelSource) {}

  get pages(): NovelPage[] {
    return this.source.pages || [];
  }

  getPage(id: string): NovelPage | undefined {
    return this.pages.find((p) => p.id === id);
  }

  init(): RuntimeState {
    const variables: Record<string, string | number | boolean> = {};
    for (const v of this.source.variables || []) {
      variables[v.name] = v.initial !== undefined ? v.initial : defaultFor(v);
    }
    const startPage = this.getPage(this.source.startPage || '') ? this.source.startPage : this.pages[0]?.id || '';
    return { pageId: startPage, variables, visited: [], chosen: [] };
  }

  /** 恢复存档：页存在才恢复，否则回起始页 */
  restore(saved: Partial<RuntimeState>): RuntimeState {
    const base = this.init();
    const pageId = saved.pageId && this.getPage(saved.pageId) ? saved.pageId : base.pageId;
    return {
      pageId,
      variables: { ...base.variables, ...(saved.variables || {}) },
      visited: Array.isArray(saved.visited) ? saved.visited : [],
      chosen: Array.isArray(saved.chosen) ? saved.chosen : [],
    };
  }

  /** 进入页面：立即执行全部 set 动作、记 visited */
  enterPage(state: RuntimeState, pageId: string): RuntimeState {
    const page = this.getPage(pageId);
    if (!page) return state;
    let next: RuntimeState = {
      ...state,
      pageId,
      visited: state.visited.includes(pageId) ? state.visited : [...state.visited, pageId],
    };
    for (const a of page.actions) {
      if (a.disabled) continue;
      if (a.type === 'set') next = this.applySet(next, a.variable, a.op, a.value);
    }
    return next;
  }

  /** 选择 choice 选项：执行选项自带 set 动作 + goto */
  pickOption(state: RuntimeState, choiceActionId: string, optionId: string): RuntimeState {
    const page = this.getPage(state.pageId);
    if (!page) return state;
    const choice = page.actions.find((a) => !a.disabled && a.id === choiceActionId && a.type === 'choice');
    if (!choice || choice.type !== 'choice') return state;
    const opt = choice.options.find((o) => o.id === optionId);
    if (!opt) return state;

    let next: RuntimeState = {
      ...state,
      chosen: state.chosen.includes(optionId) ? state.chosen : [...state.chosen, optionId],
    };
    for (const a of opt.actions || []) {
      if (a.disabled) continue;
      if (a.type === 'set') next = this.applySet(next, a.variable, a.op, a.value);
    }
    if (opt.goto && this.getPage(opt.goto)) {
      next = this.enterPage(next, opt.goto);
    }
    return next;
  }

  /** goto 出口的「继续」：跳转目标页 */
  continueGoto(state: RuntimeState, target: string): RuntimeState {
    return this.enterPage(state, target);
  }

  /** 页面上第一个可用的同步 timer（作为出口闸门） */
  getTimerAction(page: NovelPage): Extract<Action, { type: 'timer' }> | null {
    for (const a of page.actions) {
      if (a.disabled) continue;
      if (a.type === 'timer') return a;
    }
    return null;
  }

  /** 页面出口：第一个 choice / goto / end */
  /**
   * 页面出口。**同一页上的多个 choice 动作会合并成一组选项**：
   * 作者常把不同分支拆成几个 choice 块（各自带条件），此前只取第一个，
   * 后面那些块里的选项永远不显示（表现为「条件满足了选项还是不出现」）。
   * goto / end 出现在 choice 之前时仍优先，保持"第一个出口生效"的语义。
   */
  getOutlet(page: NovelPage): Outlet {
    const choiceActionIds: string[] = [];
    for (const a of page.actions) {
      if (a.disabled) continue;
      if (a.type === 'choice') {
        choiceActionIds.push(a.id);
        continue; // 继续扫，把本页所有 choice 收齐
      }
      // goto/end 只在它前面没有 choice 时才作为出口
      if (choiceActionIds.length === 0) {
        if (a.type === 'goto') return { kind: 'goto', pageId: page.id, target: a.target };
        if (a.type === 'end') return { kind: 'end', pageId: page.id };
      }
    }
    if (choiceActionIds.length > 0) return { kind: 'choice', pageId: page.id, choiceActionIds };
    return { kind: 'none', pageId: page.id };
  }

  /** choice 选项是否可见（visible 条件不满足则隐藏） */
  isOptionVisible(opt: ChoiceOption, state: RuntimeState): boolean {
    if (!opt.visible) return true;
    return evalCondition(opt.visible, {
      variables: state.variables,
      visited: state.visited,
      chosen: state.chosen,
    });
  }

  /** choice 选项是否锁定（locked 条件不满足则置灰 + lockLabel） */
  isOptionLocked(opt: ChoiceOption, state: RuntimeState): { locked: boolean; lockLabel?: string } {
    if (opt.locked) {
      const ok = evalCondition(opt.locked, {
        variables: state.variables,
        visited: state.visited,
        chosen: state.chosen,
      });
      if (!ok) return { locked: true, lockLabel: opt.lockLabel || '未满足条件' };
    }
    return { locked: false };
  }

  private applySet(
    state: RuntimeState,
    variable: string,
    op: 'set' | 'add',
    value: string | number | boolean,
  ): RuntimeState {
    const variables = { ...state.variables };
    const cur = variables[variable];
    if (op === 'add') {
      const n = (typeof cur === 'number' ? cur : Number(cur || 0)) + (typeof value === 'number' ? value : Number(value || 0));
      variables[variable] = Number.isFinite(n) ? n : Number(cur || 0);
    } else {
      variables[variable] = value;
    }
    return { ...state, variables };
  }
}

function defaultFor(v: NovelVariable): string | number | boolean {
  switch (v.type) {
    case 'bool':
      return false;
    case 'number':
      return 0;
    default:
      return '';
  }
}
