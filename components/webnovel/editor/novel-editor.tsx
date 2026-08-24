'use client';

/**
 * 小说编辑器外壳（milovana 形态）：顶栏 + 左页面列表 + 主区动作序列 + 变量面板。
 * 编辑的是本地 source 状态，点「保存」才回写后端。
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/icon';
import type { Novel, NovelSource } from '@/lib/webnovel/types';
import { PageList } from './page-list';
import { ActionEditor } from './action-editor';
import { VariablesPanel } from './variables-panel';
import { AiRefineBox } from './ai-refine-box';
import { normalizeSource, toPageRefs } from './helpers';

export function NovelEditor({
  novel,
  busy,
  onCancel,
  onSave,
  onRefined,
}: {
  novel: Novel;
  busy: boolean;
  onCancel: () => void;
  onSave: (next: { title: string; description: string; tags: string[]; source: NovelSource }) => void;
  /** AI 增量修改完成后刷新（内容已由后端写回作品） */
  onRefined?: () => Promise<void> | void;
}) {
  const [source, setSource] = useState<NovelSource>(() => normalizeSource(novel.source));
  const [selectedId, setSelectedId] = useState<string>(() => source.pages[0]?.id ?? '');
  const [showVars, setShowVars] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [title, setTitle] = useState(novel.title);
  const [description, setDescription] = useState(novel.description);
  const [tags, setTags] = useState(novel.tags.join(', '));

  const page = source.pages.find((p) => p.id === selectedId) || source.pages[0];
  const pageRefs = toPageRefs(source.pages);
  // 传完整变量对象（不只名字）：set / 条件的值控件要按变量类型决定形态
  const varNames = source.variables;

  // 未发布作品的预览要带 token（游客直接访问同一地址是 404）
  const previewHref =
    novel.status === 'published'
      ? `/webnovel/play/${novel.slug}`
      : `/webnovel/play/${novel.slug}?preview=${encodeURIComponent(
          (typeof window !== 'undefined' && localStorage.getItem('forum-auth-token')) || '',
        )}`;

  function patchPage(pageId: string, updater: (p: (typeof source.pages)[number]) => (typeof source.pages)[number]) {
    setSource((s) => ({ ...s, pages: s.pages.map((p) => (p.id === pageId ? updater(p) : p)) }));
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      {/* 顶栏 */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Button
          size="sm"
          disabled={busy || !title.trim()}
          onClick={() =>
            onSave({
              title: title.trim(),
              description: description.trim(),
              tags: tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
              source,
            })
          }
        >
          {busy ? '保存中…' : '保存'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          取消
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowInfo((v) => !v)} aria-pressed={showInfo}>
          <Icon icon="mdi:information-outline" className="size-3.5" />
          基本信息
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowVars((v) => !v)} aria-pressed={showVars}>
          <Icon icon="mdi:variable" className="size-3.5" />
          变量{source.variables.length > 0 ? `（${source.variables.length}）` : ''}
        </Button>
        {onRefined && <AiRefineBox slug={novel.slug} onRefined={onRefined} />}
        <span className="flex-1" />
        {/* 预览对草稿也可用：带上作者 token，后端据此放行未发布作品；游客访问同一
            地址仍是 404（见 webnovel.play.$slug.server.ts）。 */}
        <a
          href={previewHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-7 items-center gap-1 border border-border px-2.5 text-xs hover:border-foreground"
        >
          <Icon icon="mdi:play" className="size-3.5" />
          预览
        </a>
        <p className="text-xs text-muted-foreground">
          {novel.status === 'published' ? '已发布' : '草稿'} · {source.pages.length} 页
        </p>
      </div>

      {showInfo && (
        <div className="grid gap-2 sm:grid-cols-2 mb-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" aria-label="标题" />
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="标签（逗号分隔）" aria-label="标签" />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="简介"
            aria-label="简介"
            className="sm:col-span-2"
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <PageList source={source} setSource={setSource} selectedPageId={selectedId} onSelect={setSelectedId} />
        {page ? (
          <ActionEditor
            page={page}
            allPages={source.pages}
            variables={varNames}
            onPatchPage={patchPage}
          />
        ) : (
          <p className="text-sm text-muted-foreground">还没有页面，先添加一页。</p>
        )}
      </div>

      {showVars && (
        <VariablesPanel
          variables={source.variables}
          onChange={(variables) => setSource((s) => ({ ...s, variables }))}
        />
      )}
    </div>
  );
}
