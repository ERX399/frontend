'use client';

/** 左栏页面列表（milovana 形态）：加页 / 重命名 / 复制 / 删除 / 设起始页。 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import type { NovelPage, NovelSource } from '@/lib/webnovel/types';
import { genId } from './helpers';

export function PageList({
  source,
  setSource,
  selectedPageId,
  onSelect,
}: {
  source: NovelSource;
  setSource: React.Dispatch<React.SetStateAction<NovelSource>>;
  selectedPageId: string;
  onSelect: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  function patchPage(id: string, updater: (p: NovelPage) => NovelPage) {
    setSource((s) => ({ ...s, pages: s.pages.map((p) => (p.id === id ? updater(p) : p)) }));
  }
  function addPage() {
    const id = 'page' + genId().slice(1);
    setSource((s) => ({ ...s, pages: [...s.pages, { id, title: '', actions: [] }] }));
    onSelect(id);
    setEditingId(id);
    setDraftName(id);
  }
  function commitRename(id: string) {
    const name = draftName.trim() || id;
    if (name === id) {
      setEditingId(null);
      return;
    }
    // 原子更新：改名 + 同步 startPage + 更新所有页面对旧名的 goto/choice 引用
    setSource((s) => ({
      ...s,
      startPage: s.startPage === id ? name : s.startPage,
      pages: s.pages.map((p) => {
        if (p.id === id) return { ...p, id: name, title: p.title || name };
        return {
          ...p,
          actions: p.actions.map((a) => {
            if (a.type === 'goto' && a.target === id) return { ...a, target: name };
            if (a.type === 'choice')
              return { ...a, options: a.options.map((o) => (o.goto === id ? { ...o, goto: name } : o)) };
            return a;
          }),
        };
      }),
    }));
    onSelect(name);
    setEditingId(null);
  }
  function duplicatePage(id: string) {
    const src = source.pages.find((p) => p.id === id);
    if (!src) return;
    const copy: NovelPage = {
      ...JSON.parse(JSON.stringify(src)),
      id: src.id + 'copy' + genId().slice(1),
      actions: (src.actions || []).map((a) => ({ ...a, id: genId() })),
    };
    setSource((s) => ({ ...s, pages: [...s.pages, copy] }));
    onSelect(copy.id);
  }
  function deletePage(id: string) {
    if (source.pages.length <= 1) return;
    const nextPages = source.pages.filter((p) => p.id !== id);
    const nextStart = source.startPage === id ? nextPages[0].id : source.startPage;
    // 引用该页的 goto / choice 目标也要清掉，否则阅读器跳转悬空
    const cleaned = nextPages.map((p) => ({
      ...p,
      actions: (p.actions || []).map((a) => {
        if (a.type === 'goto' && a.target === id) return { ...a, target: '' };
        if (a.type === 'choice')
          return { ...a, options: (a.options || []).map((o) => (o.goto === id ? { ...o, goto: undefined } : o)) };
        return a;
      }),
    }));
    setSource((s) => ({ ...s, startPage: nextStart, pages: cleaned }));
    if (selectedPageId === id) onSelect(nextPages[0].id);
  }

  return (
    <aside className="md:border-r md:border-border md:pr-3 md:mr-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">页面（{source.pages.length}）</h4>
        <Button variant="outline" size="xs" onClick={addPage}>
          <Icon icon="mdi:plus" className="size-3.5" />
          新页
        </Button>
      </div>
      <ul className="space-y-1">
        {source.pages.map((p) => {
          const isStart = p.id === source.startPage;
          const selected = p.id === selectedPageId;
          const editing = editingId === p.id;
          return (
            <li
              key={p.id}
              // 编辑态不套反色：选中项的 bg-foreground/text-background 会被内嵌 Input
              // 继承成黑底黑字，输入内容看不见
              className={`border text-sm ${
                editing
                  ? 'border-foreground bg-background text-foreground'
                  : selected
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-transparent'
              }`}
            >
              {editing ? (
                <div className="p-1.5 flex items-center gap-1">
                  <Input
                    className="h-6 flex-1 text-sm bg-background text-foreground"
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={() => commitRename(p.id)}
                    onKeyDown={(e) => e.key === 'Enter' && commitRename(p.id)}
                    aria-label="页面新名称"
                  />
                  <Button variant="ghost" size="icon-xs" onClick={() => commitRename(p.id)} aria-label="确认改名">
                    <Icon icon="mdi:check" className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer" onClick={() => onSelect(p.id)} data-page-id={p.id}>
                  <span className="min-w-0 flex-1 truncate font-mono">
                    {p.title?.trim() ? p.title : p.id}
                  </span>
                  {isStart && (
                    <span className="text-[10px] shrink-0 border border-current px-1">start</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(p.id);
                      setDraftName(p.id);
                    }}
                    aria-label={`重命名 ${p.id}`}
                  >
                    <Icon icon="mdi:pencil-outline" className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicatePage(p.id);
                    }}
                    aria-label={`复制 ${p.id}`}
                  >
                    <Icon icon="mdi:content-copy" className="size-3.5" />
                  </Button>
                  {!isStart && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(p.id);
                      }}
                      aria-label={`删除 ${p.id}`}
                      disabled={source.pages.length <= 1}
                    >
                      <Icon icon="mdi:trash-can-outline" className="size-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
        页面名是「start」的为起始页。分支选项和跳转都指向页面名。
      </p>
    </aside>
  );
}
