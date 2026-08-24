'use client';

/** Choice 动作的选项编辑器：每项 = label + goto 目标页 + visible/locked 条件 + lockLabel。 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Icon } from '@/components/ui/icon';
import type { ChoiceOption, NovelVariable } from '@/lib/webnovel/types';
import { ConditionEditor } from './condition-editor';
import { genId, newOption, pageLabel, type PageRef } from './helpers';

export function ChoiceEditor({
  options,
  onChange,
  pages,
  variables,
}: {
  options: ChoiceOption[];
  onChange: (next: ChoiceOption[]) => void;
  pages: PageRef[];
  variables: NovelVariable[];
}) {
  function patch(i: number, patch: Partial<ChoiceOption>) {
    onChange(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">分支选项（{options.length}）</p>
      {options.map((o, i) => (
        <div key={o.id} className="border border-border p-2 space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Input
              className="h-7 flex-1 min-w-[8rem] text-sm"
              value={o.label}
              onChange={(e) => patch(i, { label: e.target.value })}
              placeholder="选项文字"
              aria-label={`选项 ${i + 1} 文字`}
            />
            <NativeSelect
              size="sm"
              value={o.goto || ''}
              onChange={(e) => patch(i, { goto: e.target.value || undefined })}
              aria-label={`选项 ${i + 1} 目标页`}
            >
              <option value="">（不跳转）</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  → {pageLabel(p)}
                </option>
              ))}
            </NativeSelect>
            <Button variant="ghost" size="icon-xs" aria-label={`删除选项 ${i + 1}`} onClick={() => onChange(options.filter((_, idx) => idx !== i))}>
              <Icon icon="mdi:close" className="size-3.5" />
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <ConditionEditor
              label="可见条件（不满足则隐藏）"
              value={o.visible}
              onChange={(c) => patch(i, { visible: c })}
              pages={pages}
              variables={variables}
            />
            <div className="space-y-2">
              <ConditionEditor
                label="锁定条件（不满足则置灰）"
                value={o.locked}
                onChange={(c) => patch(i, { locked: c })}
                pages={pages}
                variables={variables}
              />
              <Input
                className="h-7 text-sm"
                value={o.lockLabel || ''}
                onChange={(e) => patch(i, { lockLabel: e.target.value })}
                placeholder="锁定提示（如：需要：钥匙）"
                aria-label={`选项 ${i + 1} 锁定提示`}
              />
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" size="xs" onClick={() => onChange([...options, newOption()])}>
        <Icon icon="mdi:plus" className="size-3.5" />
        添加选项
      </Button>
    </div>
  );
}
