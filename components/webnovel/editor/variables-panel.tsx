'use client';

/**
 * 变量声明面板：作品内全局变量（名/类型/初始值）。阅读器里用 set 动作赋值、条件引用。
 *
 * 初始值按类型给控件：布尔 → 下拉 true/false（存真布尔）、数字 → 数字框（存真数字）、
 * 字符串 → 文本框。此前一律按文本存，布尔变量会存成字符串 `"false"`，
 * 与条件那侧的真布尔对不上，导致「set true 后条件判不中」。
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Icon } from '@/components/ui/icon';
import type { NovelVariable } from '@/lib/webnovel/types';
import { NumberField } from './number-field';
import { genId } from './helpers';

/** 切换类型时把初始值转成该类型的合法值 */
function coerceInitial(type: NovelVariable['type'], v: unknown): string | number | boolean {
  if (type === 'bool') {
    if (typeof v === 'boolean') return v;
    return String(v).trim().toLowerCase() === 'true';
  }
  if (type === 'number') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return v === undefined || v === null ? '' : String(v);
}

export function VariablesPanel({
  variables,
  onChange,
}: {
  variables: NovelVariable[];
  onChange: (next: NovelVariable[]) => void;
}) {
  function patch(i: number, p: Partial<NovelVariable>) {
    onChange(variables.map((v, idx) => (idx === i ? { ...v, ...p } : v)));
  }
  return (
    <div className="border-t border-border pt-3 mt-4">
      <h4 className="text-sm font-semibold mb-2">道具与变量（{variables.length}）</h4>
      <p className="text-xs text-muted-foreground mb-2">
        <b>道具</b>：玩家可见 —— 获得时弹提示、背包里能看到名称和用途（钥匙、手电筒这类卡进度的东西用它）。
        <br />
        <b>变量</b>：仅编辑器可见 —— 用于剧情暗线、隐藏结局的开关。
      </p>
      <div className="space-y-2">
        {variables.map((v, i) => (
          <div key={i} className="border border-border p-2 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <NativeSelect
              size="sm"
              value={v.kind === 'item' ? 'item' : 'flag'}
              onChange={(e) => patch(i, { kind: e.target.value as 'item' | 'flag' })}
              aria-label={`第 ${i + 1} 项 类别`}
            >
              <option value="flag">变量（隐藏）</option>
              <option value="item">道具（玩家可见）</option>
            </NativeSelect>
            <Input
              className="h-7 w-32 text-sm"
              value={v.name}
              onChange={(e) => patch(i, { name: e.target.value })}
              placeholder="标识（如 hasKey）"
              aria-label={`变量 ${i + 1} 名`}
            />
            <NativeSelect
              size="sm"
              value={v.type}
              onChange={(e) => {
                const type = e.target.value as NovelVariable['type'];
                patch(i, { type, initial: coerceInitial(type, v.initial) });
              }}
              aria-label={`变量 ${i + 1} 类型`}
            >
              <option value="bool">布尔</option>
              <option value="number">数字</option>
              <option value="string">字符串</option>
            </NativeSelect>

            {/* 初始值：按类型给控件，存真实类型 */}
            {v.type === 'bool' ? (
              <NativeSelect
                size="sm"
                value={coerceInitial('bool', v.initial) ? 'true' : 'false'}
                onChange={(e) => patch(i, { initial: e.target.value === 'true' })}
                aria-label={`变量 ${i + 1} 初始值`}
              >
                <option value="false">false（假）</option>
                <option value="true">true（真）</option>
              </NativeSelect>
            ) : v.type === 'number' ? (
              <NumberField
                className="h-7 w-24 text-sm"
                min={Number.MIN_SAFE_INTEGER}
                value={Number(coerceInitial('number', v.initial))}
                onChange={(n) => patch(i, { initial: n })}
                aria-label={`变量 ${i + 1} 初始值`}
              />
            ) : (
              <Input
                className="h-7 w-24 text-sm"
                value={String(v.initial ?? '')}
                onChange={(e) => patch(i, { initial: e.target.value })}
                placeholder="初始值"
                aria-label={`变量 ${i + 1} 初始值`}
              />
            )}

            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`删除变量 ${v.name}`}
              onClick={() => onChange(variables.filter((_, idx) => idx !== i))}
            >
              <Icon icon="mdi:close" className="size-3.5" />
            </Button>
          </div>

          {/* 道具才需要给玩家看的名称与用途 */}
          {v.kind === 'item' && (
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                className="h-7 w-40 text-sm"
                value={v.label || ''}
                onChange={(e) => patch(i, { label: e.target.value })}
                placeholder="道具名（如 档案室的钥匙）"
                aria-label={`道具 ${i + 1} 显示名`}
              />
              <Input
                className="h-7 flex-1 min-w-[10rem] text-sm"
                value={v.description || ''}
                onChange={(e) => patch(i, { description: e.target.value })}
                placeholder="用途说明（背包里展示，如 能打开地下室的铁门）"
                aria-label={`道具 ${i + 1} 用途`}
              />
            </div>
          )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
      <Button
        variant="outline"
        size="xs"
        onClick={() =>
          onChange([
            ...variables,
            { name: 'item' + genId('').slice(1), type: 'bool', initial: false, kind: 'item', label: '', description: '' },
          ])
        }
      >
        <Icon icon="mdi:package-variant-closed" className="size-3.5" />
        添加道具
      </Button>
      <Button
        variant="outline"
        size="xs"
        onClick={() => onChange([...variables, { name: 'var' + genId('').slice(1), type: 'bool', initial: false, kind: 'flag' }])}
      >
        <Icon icon="mdi:plus" className="size-3.5" />
        添加变量
      </Button>
      </div>
    </div>
  );
}
