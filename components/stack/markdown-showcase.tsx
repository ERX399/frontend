'use client';

import { useMemo, useState } from 'react';
import { renderMarkdown } from '@/lib/render-markdown';

const SAMPLE = `## 二级标题

正文段落用 **加粗**、*斜体*、\`行内代码\` 混排，
外链写成 [链接](https://520pro.top) 的样子。

### 三级标题

- 无序列表第一项
- 第二项，带 \`code\`
- 第三项

1. 有序列表
2. 按顺序数

> 引用块：终端 shell 风格的左边线

| 语言 | 用途 |
| --- | --- |
| Inter | 正文 |
| Geist Mono | 等宽 |

\`\`\`typescript
interface Row {
  name: string;
  version: string;
}

export function toRows(rows: Row[]): string[] {
  return rows.map((r) => \`\${r.name}@\${r.version}\`);
}
\`\`\`
`;

type View = 'preview' | 'source';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function MarkdownShowcase() {
  const [view, setView] = useState<View>('preview');
  const html = useMemo(() => renderMarkdown(SAMPLE), []);
  const sourceHtml = useMemo(
    () => `<pre class="hljs"><code>${escapeHtml(SAMPLE)}</code></pre>`,
    [],
  );

  return (
    <div className="mt-4">
      <div className="flex border border-b-0 border-border font-display text-xs">
        {(
          [
            ['preview', '渲染效果'],
            ['source', '源码'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            aria-pressed={view === key}
            className={
              'px-3 py-1.5 transition-colors duration-75 ' +
              (view === key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-foreground hover:text-background')
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="markdown-showcase border border-border bg-muted/30 p-4 sm:p-6">
        {view === 'preview' ? (
          <div
            className="prose prose-zinc dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div
            className="prose prose-zinc dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: sourceHtml }}
          />
        )}
      </div>
    </div>
  );
}
