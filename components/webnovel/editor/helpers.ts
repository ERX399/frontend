import type { Action, ChoiceOption, NovelPage, NovelSource } from '@/lib/webnovel/types';

/** 下拉里引用页面用的轻量结构 */
export interface PageRef {
  id: string;
  title?: string;
}

export function toPageRefs(pages: NovelPage[]): PageRef[] {
  return pages.map((p) => ({ id: p.id, title: p.title }));
}

/**
 * 页面在下拉里的显示文本。
 *
 * 页面 id 必须是英文（内部标识、被 goto/条件引用），但**不能把裸 id 摊给作者看** ——
 * 左边页面列表写着「走廊」、右边跳转下拉却是 `corridor`，作者得自己在脑子里做映射。
 */
export function pageLabel(p: PageRef): string {
  const t = p.title?.trim();
  return t && t !== p.id ? `${t}（${p.id}）` : p.id;
}

/** 随机短 id（编辑器里事件时调用，客户端） */
export function genId(prefix = 'a'): string {
  return prefix + Math.random().toString(36).slice(2, 8);
}

export function newAction(type: Action['type']): Action {
  const base = { id: genId() };
  switch (type) {
    case 'image':
      return { ...base, type, image: '' };
    case 'say':
      return { ...base, type, text: '', align: 'left' };
    case 'timer':
      return { ...base, type, duration: { mode: 'specific', seconds: 5 }, style: 'normal' };
    case 'choice':
      return { ...base, type, options: [newOption()] };
    case 'goto':
      return { ...base, type, target: '' };
    case 'set':
      return { ...base, type, variable: '', op: 'set', value: '' };
    case 'end':
      return { ...base, type };
  }
}

export function newOption(): ChoiceOption {
  return { id: genId('o'), label: '选项' };
}

/** 新建作品 / 旧格式 source 归一化到 pages/actions 新格式 */
export function normalizeSource(s: NovelSource | null | undefined): NovelSource {
  if (s && Array.isArray(s.pages) && s.pages.length > 0) {
    return {
      startPage: s.pages.some((p) => p.id === s.startPage) ? s.startPage : s.pages[0].id,
      variables: s.variables || [],
      pages: s.pages,
    };
  }
  return {
    startPage: 'start',
    variables: [],
    pages: [
      {
        id: 'start',
        title: '开始',
        actions: [{ id: genId(), type: 'say', text: '', align: 'left' }],
      },
    ],
  };
}
