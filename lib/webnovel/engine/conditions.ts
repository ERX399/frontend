/**
 * 条件求值（纯函数，读/预览/测试共用）。
 * 结构化 Condition 树 → boolean。编辑器用可视化构造器产出这棵树，
 * 不用裸 JS（对标 milovana 的 Eval/Visible，但更稳、可校验）。
 */
import type { Condition } from '../types';

export interface ConditionContext {
  variables: Record<string, string | number | boolean>;
  visited: string[];
  chosen: string[];
}

export function evalCondition(cond: Condition | undefined, ctx: ConditionContext): boolean {
  if (!cond) return true;
  switch (cond.op) {
    case 'true':
      return true;
    case 'visited':
      return ctx.visited.includes(cond.page);
    case 'var': {
      const v = ctx.variables[cond.variable];
      return compareValues(v, cond.compare, cond.value);
    }
    case 'and':
      return cond.items.every((c) => evalCondition(c, ctx));
    case 'or':
      return cond.items.some((c) => evalCondition(c, ctx));
    case 'not':
      return !evalCondition(cond.item, ctx);
  }
}

/**
 * 归一化：把 "true"/"false" 这类字符串还原成布尔。
 *
 * 编辑器早期把变量值一律按文本存（`e.target.value`），于是布尔变量在库里
 * 可能是字符串 `"true"`，而条件那侧存的是真布尔 `true` —— 两边类型不一致，
 * 比较结果全看兜底分支的运气。这里在比较前统一形态，老作品也能正常判定。
 */
function normalize(v: string | number | boolean | undefined): string | number | boolean | undefined {
  if (typeof v !== 'string') return v;
  const t = v.trim().toLowerCase();
  if (t === 'true') return true;
  if (t === 'false') return false;
  return v;
}

function compareValues(
  rawActual: string | number | boolean | undefined,
  op: '==' | '!=' | '>' | '>=' | '<' | '<=',
  rawExpected: string | number | boolean,
): boolean {
  const actual = normalize(rawActual);
  const expected = normalize(rawExpected) as string | number | boolean;

  // 布尔参与比较时按布尔判定（避免 Number(true)=1 与 Number("true")=NaN 打架）
  if (typeof actual === 'boolean' || typeof expected === 'boolean') {
    const ab = typeof actual === 'boolean' ? actual : !!actual;
    const eb = typeof expected === 'boolean' ? expected : !!expected;
    if (op === '==') return ab === eb;
    if (op === '!=') return ab !== eb;
    // 布尔不参与大小比较，按 0/1 兜底
    const an0 = ab ? 1 : 0;
    const bn0 = eb ? 1 : 0;
    switch (op) {
      case '>': return an0 > bn0;
      case '>=': return an0 >= bn0;
      case '<': return an0 < bn0;
      case '<=': return an0 <= bn0;
    }
  }

  // 两侧都能转数字时按数值比较
  const an = typeof actual === 'number' ? actual : Number(actual);
  const bn = typeof expected === 'number' ? expected : Number(expected);
  if (Number.isFinite(an) && Number.isFinite(bn)) {
    switch (op) {
      case '==':
        return an === bn;
      case '!=':
        return an !== bn;
      case '>':
        return an > bn;
      case '>=':
        return an >= bn;
      case '<':
        return an < bn;
      case '<=':
        return an <= bn;
    }
  }
  // 否则字符串比较
  const as = String(actual ?? '');
  const bs = String(expected);
  switch (op) {
    case '==':
      return as === bs;
    case '!=':
      return as !== bs;
    case '>':
      return as > bs;
    case '>=':
      return as >= bs;
    case '<':
      return as < bs;
    case '<=':
      return as <= bs;
  }
}
