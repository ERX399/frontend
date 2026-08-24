'use client';

/**
 * 数字输入框（编辑器专用）。
 *
 * 直接对 number input 写 `Number(e.target.value) || 1` 的写法有两个恶心的表现：
 * 清空时 `Number('')` 是 0、`0 || 1` 立刻把 1 填回去 —— 框里永远删不掉那个值；
 * 想把 1 改成 3 只能先打成 13 再删掉 1。
 *
 * 这里用本地字符串态：编辑期间允许空串和中间态，只在值合法时向上同步；
 * 失焦（或空值）时归一到 min，保证 source 里永远是合法数字。
 */
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

export function NumberField({
  value,
  onChange,
  min = 1,
  max,
  className,
  'aria-label': ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  className?: string;
  'aria-label'?: string;
}) {
  const [draft, setDraft] = useState(String(value));

  // 外部值变化（切换动作/页面）时同步，但不要打断正在输入的中间态
  useEffect(() => {
    setDraft((d) => (Number(d) === value ? d : String(value)));
  }, [value]);

  function commit(raw: string) {
    const n = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(n)) {
      setDraft(String(min));
      onChange(min);
      return;
    }
    let next = Math.round(n);
    if (next < min) next = min;
    if (max !== undefined && next > max) next = max;
    setDraft(String(next));
    onChange(next);
  }

  return (
    <Input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      className={className}
      aria-label={ariaLabel}
      value={draft}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw); // 允许空串 / 中间态，不立刻回填
        const n = Number(raw);
        if (raw.trim() !== '' && Number.isFinite(n) && n >= min && (max === undefined || n <= max)) {
          onChange(Math.round(n));
        }
      }}
      onBlur={(e) => commit(e.target.value)}
    />
  );
}
