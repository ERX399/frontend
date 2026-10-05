const SAMPLES = [
  {
    id: 'inter',
    label: 'Inter Variable',
    pkg: '@fontsource-variable/inter',
    variable: '--font-inter-sans',
    usage: '全站正文',
    stack: "var(--font-inter-sans)",
    text: '正文 Handgloves 0123',
  },
  {
    id: 'geist-mono',
    label: 'Geist Mono Variable',
    pkg: '@fontsource-variable/geist-mono',
    variable: '--font-geist-mono',
    usage: '代码块 / 表格 / 标识',
    stack: "var(--font-geist-mono)",
    text: 'const n = rows.len',
  },
  {
    id: 'lora',
    label: 'Lora Variable',
    pkg: '@fontsource-variable/lora',
    variable: '--font-heading',
    usage: '标题 / 按钮衬线',
    stack: "var(--font-heading)",
    text: '标题 Handgloves 0123',
  },
  {
    id: 'geist',
    label: 'Geist Variable',
    pkg: '@fontsource-variable/geist',
    variable: '--font-geist-sans',
    usage: '小标题 / Toast 提示',
    stack: "var(--font-geist-sans)",
    text: '本页目录 0123 Handg',
  },
];

const SIZES = [
  { cls: 'text-2xl', name: '2xl' },
  { cls: 'text-base', name: 'base' },
  { cls: 'text-xs', name: 'xs' },
];

export function FontShowcase() {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {SAMPLES.map((s) => (
        <div key={s.id} className="flex flex-col border border-border bg-card p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-xs font-medium">{s.label}</span>
            <span className="border border-border px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground">
              {s.usage}
            </span>
          </div>

          <div
            className="mt-3 flex flex-col gap-1 border-t border-border pt-3"
            style={{ fontFamily: s.stack }}
          >
            {SIZES.map((sz) => (
              <div key={sz.name} className="flex items-baseline gap-3">
                <span className="w-8 shrink-0 font-mono text-[0.625rem] text-muted-foreground">
                  {sz.name}
                </span>
                <span className={sz.cls + ' min-w-0 truncate leading-tight'} title={s.text}>
                  {s.text}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 border-t border-border pt-2 font-mono text-[0.625rem] text-muted-foreground">
            {s.pkg} · {s.variable}
          </div>
        </div>
      ))}
    </div>
  );
}
