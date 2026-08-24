'use client';

/**
 * 可视化条件构造器（对标 milovana 用裸 JS 的 Eval/Visible，但用结构化条件树）。
 *
 * 内部用扁平模型编辑：combine(and/or) + clauses[]；导出时组装成 Condition 树。
 * 支持两类子句：visited(已访问某页) / var(变量 比较 值)。空子句 = 无条件。
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Icon } from '@/components/ui/icon';
import type { Condition, NovelVariable } from '@/lib/webnovel/types';
import { NumberField } from './number-field';
import { pageLabel, type PageRef } from './helpers';

type Clause =
  | { kind: 'visited'; page: string }
  | { kind: 'var'; variable: string; compare: '==' | '!=' | '>' | '>=' | '<' | '<='; value: string };

interface FlatModel {
  combine: 'and' | 'or';
  clauses: Clause[];
}

const COMPARE_OPTS: { v: string; label: string }[] = [
  { v: '==', label: '等于' },
  { v: '!=', label: '不等于' },
  { v: '>', label: '大于' },
  { v: '>=', label: '大于等于' },
  { v: '<', label: '小于' },
  { v: '<=', label: '小于等于' },
];

/** 把条件树压平成扁平模型（遇到无法表示的子树则忽略该层） */
function toFlat(c: Condition | undefined): FlatModel {
  if (!c) return { combine: 'and', clauses: [] };
  if (c.op === 'and' || c.op === 'or') {
    const clauses: Clause[] = [];
    for (const item of c.items) {
      if (item.op === 'visited') clauses.push({ kind: 'visited', page: item.page });
      else if (item.op === 'var') {
        clauses.push({
          kind: 'var',
          variable: item.variable,
          compare: item.compare,
          value: String(item.value),
        });
      }
      // 其它形态（not/嵌套）扁平模型表达不了，丢弃
    }
    return { combine: c.op, clauses };
  }
  if (c.op === 'visited') return { combine: 'and', clauses: [{ kind: 'visited', page: c.page }] };
  if (c.op === 'var') {
    return { combine: 'and', clauses: [{ kind: 'var', variable: c.variable, compare: c.compare, value: String(c.value) }] };
  }
  return { combine: 'and', clauses: [] };
}

function toCondition(m: FlatModel): Condition | undefined {
  if (m.clauses.length === 0) return undefined;
  const items: Condition[] = m.clauses.map((cl): Condition =>
    cl.kind === 'visited'
      ? { op: 'visited', page: cl.page }
      : { op: 'var', variable: cl.variable, compare: cl.compare, value: coerce(cl.value) },
  );
  if (items.length === 1) return items[0];
  return { op: m.combine, items };
}

/** 取子句所引用变量的类型（决定值控件形态）；变量不存在时按字符串处理 */
function clauseVarType(variables: NovelVariable[], cl: Clause): NovelVariable['type'] | undefined {
  if (cl.kind !== 'var') return undefined;
  return variables.find((v) => v.name === cl.variable)?.type;
}

function coerce(v: string): string | number | boolean {
  if (v === 'true') return true;
  if (v === 'false') return false;
  const n = Number(v);
  if (v !== '' && Number.isFinite(n)) return n;
  return v;
}

export function ConditionEditor({
  value,
  onChange,
  pages,
  variables,
  label,
}: {
  value: Condition | undefined;
  onChange: (c: Condition | undefined) => void;
  pages: PageRef[];
  variables: NovelVariable[];
  label?: string;
}) {
  const [m, setM] = useState<FlatModel>(() => toFlat(value));

  function emit(next: FlatModel) {
    setM(next);
    onChange(toCondition(next));
  }

  function patchClause(i: number, patch: Partial<Clause>) {
    emit({ ...m, clauses: m.clauses.map((cl, idx) => (idx === i ? { ...cl, ...patch } as Clause : cl)) });
  }

  return (
    <div className="border border-border p-2 space-y-2">
      {label && <p className="text-xs font-semibold text-muted-foreground">{label}</p>}
      {m.clauses.length === 0 ? (
        <p className="text-xs text-muted-foreground">无条件（始终满足）</p>
      ) : (
        <div className="space-y-1.5">
          {m.clauses.length > 1 && (
            <div className="flex items-center gap-1.5">
              <NativeSelect
                size="sm"
                value={m.combine}
                onChange={(e) => emit({ ...m, combine: e.target.value as 'and' | 'or' })}
                aria-label="条件组合方式"
              >
                <option value="and">全部满足（且）</option>
                <option value="or">任一满足（或）</option>
              </NativeSelect>
            </div>
          )}
          {m.clauses.map((cl, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-wrap">
              <NativeSelect
                size="sm"
                value={cl.kind}
                onChange={(e) => {
                  const kind = e.target.value as 'visited' | 'var';
                  if (kind === 'visited') patchClause(i, { kind, page: pages[0]?.id || '' } as Clause);
                  else {
                    // 默认挑第一个变量，并按其类型给一个合法初值（布尔默认 true，
                    // 数字默认 0）—— 此前默认空串，布尔条件不手打 true 就永远判不中
                    const first = variables[0];
                    const dv = first?.type === 'bool' ? 'true' : first?.type === 'number' ? '0' : '';
                    patchClause(i, { kind, variable: first?.name || '', compare: '==', value: dv } as Clause);
                  }
                }}
                aria-label={`条件 ${i + 1} 类型`}
              >
                <option value="visited">已访问页面</option>
                <option value="var">变量</option>
              </NativeSelect>
              {cl.kind === 'visited' ? (
                <NativeSelect
                  size="sm"
                  value={cl.page}
                  onChange={(e) => patchClause(i, { page: e.target.value })}
                  aria-label={`条件 ${i + 1} 目标页`}
                >
                  {pages.length === 0 && <option value="">（暂无页面）</option>}
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {pageLabel(p)}
                    </option>
                  ))}
                </NativeSelect>
              ) : (
                <>
                  <NativeSelect
                    size="sm"
                    value={cl.variable}
                    onChange={(e) => {
                      const nextVar = variables.find((v) => v.name === e.target.value);
                      const dv = nextVar?.type === 'bool' ? 'true' : nextVar?.type === 'number' ? '0' : '';
                      patchClause(i, { variable: e.target.value, value: dv });
                    }}
                    aria-label={`条件 ${i + 1} 变量`}
                  >
                    {variables.length === 0 && <option value="">（暂无变量）</option>}
                    {variables.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </NativeSelect>
                  <NativeSelect
                    size="sm"
                    value={cl.compare}
                    onChange={(e) => patchClause(i, { compare: e.target.value } as Clause)}
                    aria-label={`条件 ${i + 1} 比较`}
                  >
                    {COMPARE_OPTS.map((o) => (
                      <option key={o.v} value={o.v}>
                        {o.label}
                      </option>
                    ))}
                  </NativeSelect>
                  {/* 值控件按变量类型走：布尔用下拉，数字用数字框，其余文本 */}
                  {clauseVarType(variables, cl) === 'bool' ? (
                    <NativeSelect
                      size="sm"
                      value={String(('value' in cl ? cl.value : '')).toLowerCase() === 'true' ? 'true' : 'false'}
                      onChange={(e) => patchClause(i, { value: e.target.value })}
                      aria-label={`条件 ${i + 1} 值`}
                    >
                      <option value="true">true（真）</option>
                      <option value="false">false（假）</option>
                    </NativeSelect>
                  ) : clauseVarType(variables, cl) === 'number' ? (
                    <NumberField
                      className="h-7 w-24 text-sm"
                      min={Number.MIN_SAFE_INTEGER}
                      value={Number.isFinite(Number('value' in cl ? cl.value : 0)) ? Number('value' in cl ? cl.value : 0) : 0}
                      onChange={(n) => patchClause(i, { value: String(n) })}
                      aria-label={`条件 ${i + 1} 值`}
                    />
                  ) : (
                    <Input
                      className="h-7 w-24 text-sm"
                      value={'value' in cl ? cl.value : ''}
                      onChange={(e) => patchClause(i, { value: e.target.value })}
                      aria-label={`条件 ${i + 1} 值`}
                      placeholder="值"
                    />
                  )}
                </>
              )}
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`删除条件 ${i + 1}`}
                onClick={() => emit({ ...m, clauses: m.clauses.filter((_, idx) => idx !== i) })}
              >
                <Icon icon="mdi:close" className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="xs"
          onClick={() => emit({ ...m, clauses: [...m.clauses, { kind: 'visited', page: pages[0]?.id || '' }] })}
        >
          <Icon icon="mdi:plus" className="size-3.5" />
          添加条件
        </Button>
        {m.clauses.length > 0 && (
          <Button variant="ghost" size="xs" onClick={() => emit({ combine: 'and', clauses: [] })}>
            清除
          </Button>
        )}
      </div>
    </div>
  );
}
