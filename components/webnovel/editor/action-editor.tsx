'use client';

/**
 * Action 序列编辑器（milovana 形态的主工作台）。
 * 左侧页面列表选中一页后，这里编辑该页的 Action 顺序块：
 * 添加 / 排序 / 复制 / 禁用启用 / 删除；每类 Action 内联编辑参数。
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Icon } from '@/components/ui/icon';
import { webnovelImageUrl, uploadImage } from '@/lib/webnovel/api/client';
import type { Action, NovelPage, NovelVariable } from '@/lib/webnovel/types';
import { ChoiceEditor } from './choice-editor';
import { NumberField } from './number-field';
import { ImagePicker, collectUsedImages } from './image-picker';
import { newAction, toPageRefs, pageLabel, type PageRef } from './helpers';

const TYPE_META: Record<Action['type'], { label: string; icon: string }> = {
  image: { label: '图片', icon: 'mdi:image' },
  say: { label: '文字', icon: 'mdi:format-text' },
  timer: { label: '计时', icon: 'mdi:timer' },
  choice: { label: '分支', icon: 'mdi:source-branch' },
  goto: { label: '跳转', icon: 'mdi:arrow-right' },
  set: { label: '设置变量', icon: 'mdi:equal' },
  end: { label: '结束', icon: 'mdi:flag-checkered' },
};

export function ActionEditor({
  page,
  allPages,
  variables,
  onPatchPage,
}: {
  page: NovelPage;
  allPages: NovelPage[];
  variables: NovelVariable[];
  onPatchPage: (pageId: string, updater: (p: NovelPage) => NovelPage) => void;
}) {
  const [addValue, setAddValue] = useState('');

  const pageRefs = toPageRefs(allPages);
  const varNames = variables;

  function patchAction(id: string, patch: Partial<Action>) {
    onPatchPage(page.id, (p) => ({ ...p, actions: p.actions.map((a) => (a.id === id ? ({ ...a, ...patch } as Action) : a)) }));
  }
  function insertAction(type: Action['type']) {
    onPatchPage(page.id, (p) => ({ ...p, actions: [...p.actions, newAction(type)] }));
  }
  function moveAction(index: number, delta: number) {
    onPatchPage(page.id, (p) => {
      const to = index + delta;
      if (to < 0 || to >= p.actions.length) return p;
      const actions = [...p.actions];
      [actions[index], actions[to]] = [actions[to], actions[index]];
      return { ...p, actions };
    });
  }
  function duplicateAction(id: string) {
    onPatchPage(page.id, (p) => {
      const i = p.actions.findIndex((a) => a.id === id);
      if (i < 0) return p;
      const copy = { ...p.actions[i], id: 'a' + Math.random().toString(36).slice(2, 8) } as Action;
      const actions = [...p.actions];
      actions.splice(i + 1, 0, copy);
      return { ...p, actions };
    });
  }
  function deleteAction(id: string) {
    onPatchPage(page.id, (p) => ({ ...p, actions: p.actions.filter((a) => a.id !== id) }));
  }
  function toggleDisabled(id: string) {
    onPatchPage(page.id, (p) => ({
      ...p,
      actions: p.actions.map((a) => (a.id === id ? { ...a, disabled: !a.disabled } : a)),
    }));
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold">
          动作序列（{page.actions.length}）
          <span className="ml-2 text-xs font-normal text-muted-foreground">按顺序执行</span>
        </h4>
        <NativeSelect
          size="sm"
          value={addValue}
          onChange={(e) => {
            const v = e.target.value as Action['type'];
            if (v) {
              insertAction(v);
              setAddValue('');
            }
          }}
          aria-label="添加动作"
          className="min-w-[8rem]"
        >
          <option value="" disabled>
            ＋ 添加动作…
          </option>
          {(Object.keys(TYPE_META) as Action['type'][]).map((t) => (
            <option key={t} value={t}>
              {TYPE_META[t].label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {page.actions.length === 0 ? (
        <p className="text-sm text-muted-foreground border-y border-border py-6 text-center">
          这一页还没有动作。点击右上「＋ 添加动作」开始。
        </p>
      ) : (
        <div className="space-y-2">
          {page.actions.map((action, i) => {
            const meta = TYPE_META[action.type];
            return (
              <div key={action.id} className={`border border-border p-2 ${action.disabled ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 shrink-0">
                    <Icon icon={meta.icon} className="size-3" />
                    {meta.label}
                    {action.disabled && <span className="text-[10px]">(已禁用)</span>}
                  </span>
                  <span className="flex-1" />
                  <Button variant="ghost" size="icon-xs" aria-label="上移" disabled={i === 0} onClick={() => moveAction(i, -1)}>
                    <Icon icon="mdi:arrow-up" className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" aria-label="下移" disabled={i === page.actions.length - 1} onClick={() => moveAction(i, 1)}>
                    <Icon icon="mdi:arrow-down" className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" aria-label="复制" onClick={() => duplicateAction(action.id)}>
                    <Icon icon="mdi:content-copy" className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" aria-label={action.disabled ? '启用' : '禁用'} onClick={() => toggleDisabled(action.id)}>
                    <Icon icon={action.disabled ? 'mdi:eye-outline' : 'mdi:eye-off-outline'} className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" aria-label="删除" onClick={() => deleteAction(action.id)}>
                    <Icon icon="mdi:trash-can-outline" className="size-3.5" />
                  </Button>
                </div>

                <ActionBody
                  action={action}
                  pageIds={pageRefs}
                  varNames={varNames}
                  allPages={allPages}
                  onPatch={(patch) => patchAction(action.id, patch)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActionBody({
  action,
  pageIds,
  varNames,
  allPages,
  onPatch,
}: {
  action: Action;
  pageIds: PageRef[];
  varNames: NovelVariable[];
  allPages: NovelPage[];
  onPatch: (patch: Partial<Action>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const usedImages = collectUsedImages(allPages);
  // set 动作的值控件按目标变量类型走；变量未选/已删时退化成文本框
  const targetVarType =
    action.type === 'set' ? varNames.find((v) => v.name === action.variable)?.type : undefined;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadImage(file); // 内部走浏览器压缩
      onPatch({ image: path });
    } catch (err) {
      onPatch({ image: '' }); // 触发重渲染，把上传错误展示在下面
      // 简易提示：复用 onPatch 传不了消息，这里直接 alert 一次
      alert(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  switch (action.type) {
    case 'image':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 只读展示：图片**只能上传**，不接受手填地址 —— 任意外链等于把
                第三方内容（含可执行 SVG）注进读者页面，是实打实的 XSS 面。 */}
            <span
              className="inline-flex h-7 flex-1 min-w-[8rem] items-center border border-border bg-secondary/40 px-2 font-mono text-xs text-muted-foreground truncate"
              aria-label="图片路径"
              title={action.image || undefined}
            >
              {action.image || '尚未选择图片'}
            </span>
            {action.image && (
              <Button variant="ghost" size="xs" onClick={() => onPatch({ image: '' })} aria-label="移除图片">
                <Icon icon="mdi:close" className="size-3.5" />
              </Button>
            )}
            <label className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 border border-border px-2.5 text-xs hover:border-foreground">
              <Icon icon="mdi:upload" className="size-3.5" />
              {uploading ? '上传中…' : '上传'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} aria-label="选择图片上传" />
            </label>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setPickerOpen((v) => !v)}
              aria-pressed={pickerOpen}
              aria-label="从已用图片选择"
            >
              <Icon icon="mdi:image-multiple" className="size-3.5" />
              历史图片{usedImages.length > 0 ? `（${usedImages.length}）` : ''}
            </Button>
          </div>
          {pickerOpen && (
            <ImagePicker
              images={usedImages}
              current={action.image}
              onPick={(img) => {
                onPatch({ image: img });
                setPickerOpen(false);
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
          {action.image && (
            <img src={webnovelImageUrl(action.image)} alt="" className="h-16 w-24 rounded border border-border object-cover" />
          )}
        </div>
      );
    case 'say':
      return (
        <div className="space-y-1.5">
          <Textarea
            value={action.text}
            onChange={(e) => onPatch({ text: e.target.value })}
            rows={2}
            placeholder="文字内容…"
            aria-label="文字内容"
          />
          <NativeSelect
            size="sm"
            value={action.align || 'left'}
            onChange={(e) => onPatch({ align: e.target.value as 'left' | 'center' | 'right' })}
            aria-label="对齐"
          >
            <option value="left">左对齐</option>
            <option value="center">居中</option>
            <option value="right">右对齐</option>
          </NativeSelect>
        </div>
      );
    case 'timer':
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <NativeSelect
            size="sm"
            value={action.duration.mode}
            onChange={(e) => onPatch({ duration: { ...action.duration, mode: e.target.value as 'specific' | 'range' } })}
            aria-label="计时模式"
          >
            <option value="specific">固定时长</option>
            <option value="range">随机区间</option>
          </NativeSelect>
          {action.duration.mode === 'specific' ? (
            <NumberField
              className="h-7 w-20 text-sm"
              min={1}
              value={action.duration.seconds ?? 5}
              onChange={(n) => onPatch({ duration: { ...action.duration, seconds: n } })}
              aria-label="固定秒数"
            />
          ) : (
            <span className="flex items-center gap-1.5 text-sm">
              <NumberField
                className="h-7 w-16 text-sm"
                min={1}
                value={action.duration.min ?? 1}
                onChange={(n) => onPatch({ duration: { ...action.duration, min: n } })}
                aria-label="最小秒数"
              />
              ~
              <NumberField
                className="h-7 w-16 text-sm"
                min={1}
                value={action.duration.max ?? 1}
                onChange={(n) => onPatch({ duration: { ...action.duration, max: n } })}
                aria-label="最大秒数"
              />
              秒
            </span>
          )}
          <NativeSelect
            size="sm"
            value={action.style}
            onChange={(e) => onPatch({ style: e.target.value as 'normal' | 'secret' | 'hidden' })}
            aria-label="计时样式"
          >
            <option value="normal">普通（显示剩余秒）</option>
            <option value="secret">秘密（只显示进度）</option>
            <option value="hidden">隐藏（无提示等待）</option>
          </NativeSelect>
          <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={!!action.autoAdvance}
              onChange={(e) => onPatch({ autoAdvance: e.target.checked })}
              aria-label="倒计时结束自动跳转"
            />
            倒计时结束自动跳转
          </label>
          <p className="w-full text-[11px] text-muted-foreground">
            勾选后，本页需再放一个「跳转」动作指定目标页：倒计时一结束就自动过去，玩家无需点「继续」。
            （出口是「分支」时不自动，仍等玩家选。）
          </p>
        </div>
      );
    case 'choice':
      return (
        <ChoiceEditor
          options={action.options}
          onChange={(options) => onPatch({ options })}
          pages={pageIds}
          variables={varNames}
        />
      );
    case 'goto':
      return (
        <NativeSelect
          size="sm"
          value={action.target}
          onChange={(e) => onPatch({ target: e.target.value })}
          aria-label="跳转目标页"
        >
          <option value="">（选择目标页）</option>
          {pageIds.map((p) => (
            <option key={p.id} value={p.id}>
              → {pageLabel(p)}
            </option>
          ))}
        </NativeSelect>
      );
    case 'set':
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <NativeSelect
            size="sm"
            value={action.variable}
            onChange={(e) => onPatch({ variable: e.target.value })}
            aria-label="目标变量"
          >
            <option value="">（选择变量）</option>
            {varNames.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect size="sm" value={action.op} onChange={(e) => onPatch({ op: e.target.value as 'set' | 'add' })} aria-label="赋值方式">
            <option value="set">设为</option>
            {/* 累加只对数字有意义 */}
            {targetVarType !== 'bool' && <option value="add">累加</option>}
          </NativeSelect>

          {/* 值：按目标变量的类型给控件，存真实类型（布尔存 true/false 而不是 "true"） */}
          {targetVarType === 'bool' && action.op === 'set' ? (
            <NativeSelect
              size="sm"
              value={action.value === true || String(action.value) === 'true' ? 'true' : 'false'}
              onChange={(e) => onPatch({ value: e.target.value === 'true' })}
              aria-label="变量值"
            >
              <option value="false">false（假）</option>
              <option value="true">true（真）</option>
            </NativeSelect>
          ) : targetVarType === 'number' ? (
            <NumberField
              className="h-7 w-24 text-sm"
              min={Number.MIN_SAFE_INTEGER}
              value={Number.isFinite(Number(action.value)) ? Number(action.value) : 0}
              onChange={(n) => onPatch({ value: n })}
              aria-label="变量值"
            />
          ) : (
            <Input
              className="h-7 w-24 text-sm"
              value={String(action.value ?? '')}
              onChange={(e) => onPatch({ value: e.target.value })}
              placeholder="值"
              aria-label="变量值"
            />
          )}
        </div>
      );
    case 'end':
      return <p className="text-xs text-muted-foreground">触发本动作后作品结束，读者看到结局画面。</p>;
  }
}
