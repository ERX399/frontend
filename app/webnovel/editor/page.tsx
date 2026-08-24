'use client';

/**
 * /webnovel/editor —— 交互小说创作（整页 ClientOnly 岛）。
 *
 * 我的作品管理 + 新建 + 发布/下架/删除；点「编辑」展开 milovana 形态的
 * 编辑器（页面列表 + Action 序列 + 变量 + 条件构造器）。
 * 鉴权复用论坛登录态：fetchMe() 用共享 JWT 对 webnovel 后端验签。
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { buttonVariants } from '@/components/ui/button';
import { NovelEditor } from '@/components/webnovel/editor/novel-editor';
import { AiCreatePanel } from '@/components/webnovel/editor/ai-create-panel';
import {
  fetchMe,
  fetchMyNovels,
  createNovel,
  updateNovel,
  publishNovel,
  deleteNovel,
  importNovel,
  downloadNovelJson,
  type NovelIssue,
} from '@/lib/webnovel/api/client';
import { getCurrentUser } from '@/lib/forum/api/client';
import type { Novel, NovelSource } from '@/lib/webnovel/types';

type AuthState = 'loading' | 'need-login' | 'ok';

const STATUS_BADGE: Record<Novel['status'], { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'bg-secondary text-secondary-foreground' },
  published: { label: '已发布', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  takedown: { label: '已下架', cls: 'bg-destructive/10 text-destructive' },
};

function emptyForm() {
  // aiGenerated：新建时默认不勾（手写的）；用 AI 创作/导入的走另外的路，由后端置位
  return { title: '', slug: '', description: '', tags: '', aiGenerated: false };
}

export default function WebnovelEditorPage() {
  const [auth, setAuth] = useState<AuthState>('loading');
  const [authorName, setAuthorName] = useState('');
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  // 导入 JSON（自己的 AI 生成的作品）
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    title: string;
    pages: number;
    issues: NovelIssue[];
  } | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await fetchMyNovels();
      setNovels(data.novels);
    } catch {
      // 列表失败不打断页面，展示旧数据即可
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe(); // 共享 JWT 验签
        if (!cancelled) setUserId(me.user?.id); // 充值链接的 remark 要用它认领订单
        if (cancelled) return;
        setAuth('ok');
        try {
          const u = await getCurrentUser({ skipAuthRedirect: true });
          if (u.username && !cancelled) setAuthorName(u.username);
        } catch {}
        await reload();
      } catch {
        if (!cancelled) setAuth('need-login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createNovel({
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim(),
        tags: form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
        authorName: authorName || undefined,
        aiGenerated: form.aiGenerated,
        source: {
          startPage: 'start',
          variables: [],
          pages: [{ id: 'start', title: '开始', actions: [{ id: 'a1', type: 'say', text: '', align: 'left' }] }],
        },
      });
      setForm(emptyForm());
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * AI 任务完成后的刷新。
   *
   * **作品由后端直接落库**（生成→建草稿 / 修改→写回），前端不再负责创建，
   * 所以这里只需要重新拉一次列表 —— 用户即使全程离线，回来也能看到成果。
   */
  async function handleAiDone() {
    setError(null);
    await reload();
  }

  /**
   * 导入 JSON。原文整段交给后端 —— 抠代码块、形状归一、补 id、修悬空跳转、
   * 体检，全在那边一条管道上做（与站内 AI 创作共用）。
   */
  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    const text = importText.trim();
    if (!text) return;
    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const r = await importNovel(text, authorName || undefined);
      setImportResult({ title: r.title, pages: r.pages, issues: r.issues });
      setImportText('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(false);
    }
  }

  /** 选择 .json 文件：读成文本填进输入框，让用户先看一眼再导入 */
  async function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportText(await file.text());
      setImportResult(null);
    } catch {
      setError('读取文件失败');
    } finally {
      e.target.value = ''; // 允许连续选同一个文件
    }
  }

  /** 切换 AI 撰写声明。站内 AI 动过的作品后端会拒绝取消（这里也会置灰） */
  async function handleToggleAi(novel: Novel, aiGenerated: boolean) {
    setBusySlug(novel.slug);
    setError(null);
    try {
      await updateNovel(novel.slug, { aiGenerated });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置失败');
    } finally {
      setBusySlug(null);
    }
  }

  /** 切换匿名发布：读者端不显示署名，作者本人与管理端照旧可见 */
  async function handleToggleAnonymous(novel: Novel, anonymous: boolean) {
    setBusySlug(novel.slug);
    setError(null);
    try {
      await updateNovel(novel.slug, { anonymous });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置失败');
    } finally {
      setBusySlug(null);
    }
  }

  async function handlePublish(novel: Novel) {
    setBusySlug(novel.slug);
    try {
      const next = novel.status === 'published' ? 'draft' : 'published';
      await publishNovel(novel.slug, next);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusySlug(null);
    }
  }

  async function handleDelete(novel: Novel) {
    setBusySlug(novel.slug);
    try {
      await deleteNovel(novel.slug);
      setDeletingSlug(null);
      setEditingSlug(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setBusySlug(null);
    }
  }

  async function handleSaveEdit(
    novel: Novel,
    next: { title: string; description: string; tags: string[]; source: NovelSource },
  ) {
    setBusySlug(novel.slug);
    setError(null);
    try {
      await updateNovel(novel.slug, next);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setBusySlug(null);
    }
  }

  if (auth === 'loading') {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <Spinner className="mx-auto" />
        <p className="mt-3 text-sm text-muted-foreground">检查登录态…</p>
      </div>
    );
  }

  if (auth === 'need-login') {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <div className="border-y border-border sm:border sm:p-6 py-6 text-center">
          <Icon icon="mdi:account-lock" className="mx-auto size-8" />
          <h2 className="mt-3 text-lg font-semibold">需要登录</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            创作交互小说需要使用论坛账号登录，进度与作品都绑定在你的账号下。
          </p>
          <Link
            to="/forum/auth/login?redirect=/webnovel/editor"
            className={buttonVariants({ variant: 'default', size: 'sm' }) + ' mt-4'}
          >
            前往论坛登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <header className="mb-5">
        <Link
          to="/webnovel"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <Icon icon="mdi:arrow-left" className="size-4" />
          返回作品列表
        </Link>
        <h1 className="text-xl font-bold">交互小说创作</h1>
        <p className="text-sm text-muted-foreground mt-1">
          按页面组织故事，每页排布图片、文字、计时、分支等动作。发布后生成公开游玩链接。
        </p>
      </header>

      {error && (
        <div className="mb-4 border-y border-destructive py-2 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      {/* AI 创作（爱发电创作点计费） */}
      <AiCreatePanel userId={userId} authorName={authorName} onCreated={handleAiDone} />

      {/* 导入 JSON —— 用自己的 AI 生成，不消耗创作点。用 details 与站内其它折叠一致 */}
      <details className="mb-6 border-y border-border py-5">
        <summary className="cursor-pointer select-none text-base font-semibold">
          导入 JSON（用你自己的 AI 生成）
        </summary>
        <p className="text-sm text-muted-foreground mt-2">
          去
          <Link to="/webnovel/format" className="underline hover:text-foreground mx-1">
            格式与提示词
          </Link>
          页复制提示词，喂给任意大模型，再把它输出的 JSON 贴到这里 —— 不消耗创作点。
          允许带 markdown 代码块和模型的客套话，会自动抠出 JSON。
        </p>
        <form onSubmit={handleImport} className="mt-3">
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={6}
            placeholder={'粘贴 AI 输出的 JSON，或从下面选择 .json 文件…'}
            aria-label="要导入的 JSON"
            className="font-mono text-xs"
          />
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <Button type="submit" size="sm" disabled={importing || !importText.trim()}>
              {importing ? '导入中…' : '导入为草稿'}
            </Button>
            <label className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' cursor-pointer'}>
              <Icon icon="mdi:file-upload-outline" className="size-4" />
              选择 .json 文件
              <input type="file" accept=".json,application/json" onChange={handlePickFile} className="hidden" />
            </label>
            {importText && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setImportText('')}>
                清空
              </Button>
            )}
          </div>
        </form>

        {importResult && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              已导入《{importResult.title}》（{importResult.pages} 页），存为草稿，可在下面编辑。
            </p>
            {importResult.issues.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">体检没发现问题。</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mt-2">
                  体检发现 {importResult.issues.length} 项（不影响已导入的内容，改完再发布）：
                </p>
                <ul className="mt-1 space-y-1">
                  {importResult.issues.map((i, n) => (
                    <li key={n} className="text-xs">
                      <span
                        className={
                          'font-mono mr-1 ' +
                          (i.level === 'error' ? 'text-destructive' : 'text-muted-foreground')
                        }
                      >
                        [{i.code}]
                      </span>
                      <span className="text-muted-foreground">{i.message}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </details>

      {/* 新建作品 */}
      <form onSubmit={handleCreate} className="mb-6 border-y border-border py-5">
        <h2 className="text-base font-semibold mb-3">新建作品</h2>
        <div className="grid gap-3">
          <div>
            <label className="text-sm text-muted-foreground" htmlFor="novel-title">标题 *</label>
            <Input
              id="novel-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="作品标题"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground" htmlFor="novel-slug">访问链接（可空，自动生成）</label>
            <Input
              id="novel-slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="my-novel-slug（小写字母/数字/横杠）"
              className="mt-1"
            />
            {form.slug && (
              <p className="mt-1 text-xs text-muted-foreground">预览：2x.nz/webnovel/{form.slug || '…'}</p>
            )}
          </div>
          <div>
            <label className="text-sm text-muted-foreground" htmlFor="novel-desc">简介</label>
            <Textarea
              id="novel-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="一句话介绍你的作品…"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground" htmlFor="novel-tags">标签（逗号分隔）</label>
            <Input
              id="novel-tags"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="悬疑, 冒险"
              className="mt-1"
            />
          </div>
          {/* AI 撰写声明：读者端会显示这个标记。用站内 AI 创作的作品由后端自动勾上并锁死 */}
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.aiGenerated}
              onChange={(e) => setForm({ ...form, aiGenerated: e.target.checked })}
              className="mt-0.5"
            />
            <span>
              这部作品由 AI 撰写
              <span className="block text-xs text-muted-foreground">
                勾选后读者会在作品页看到「AI 撰写」标记。用站内「AI 创作」或「AI 修改」写出来的作品会自动勾上，且不能取消。
              </span>
            </span>
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button type="submit" size="sm" disabled={submitting || !form.title.trim()}>
            {submitting ? '创建中…' : '创建'}
          </Button>
        </div>
      </form>

      {/* 我的作品 */}
      <section>
        <h2 className="text-base font-semibold mb-3">我的作品（{novels.length}）</h2>
        {novels.length === 0 ? (
          <p className="text-sm text-muted-foreground border-y border-border py-8 text-center">
            还没有作品，从上面创建一个吧。
          </p>
        ) : (
          <div className="border-t border-border md:border-l">
            {novels.map((n) => {
              const badge = STATUS_BADGE[n.status];
              const editing = editingSlug === n.slug;
              return (
                <div key={n.id} className="border-b border-border md:border-r py-4 md:p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold">{n.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1 text-xs text-muted-foreground">
                        <span className="shrink-0">2x.nz/webnovel/{n.slug}</span>
                        <span className="shrink-0">{n.updatedAt.slice(0, 10)}</span>
                        {n.source?.pages?.length ? <span className="shrink-0">{n.source.pages.length} 页</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      {n.status === 'published' && (
                        <Link to={`/webnovel/${n.slug}`} className={buttonVariants({ variant: 'outline', size: 'xs' })}>
                          <Icon icon="mdi:open-in-new" className="size-3.5" />
                          查看
                        </Link>
                      )}
                      <Button variant="secondary" size="xs" onClick={() => setEditingSlug(editing ? null : n.slug)}>
                        {editing ? '收起' : '编辑'}
                      </Button>
                      {/* 导出：拿去配合「改写提示词」让 AI 在已有成果上继续改 */}
                      <Button
                        variant="outline"
                        size="xs"
                        title="下载作品 JSON"
                        onClick={() => downloadNovelJson(n.slug, n)}
                      >
                        <Icon icon="mdi:download-outline" className="size-3.5" />
                        导出
                      </Button>
                      {/* 匿名发布：读者端不显示署名，作者本人仍能在这里看到设置 */}
                      <label className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!n.anonymous}
                          disabled={busySlug === n.slug}
                          onChange={(e) => handleToggleAnonymous(n, e.target.checked)}
                          aria-label={`${n.title} 匿名发布`}
                        />
                        匿名
                      </label>
                      {/* AI 撰写声明。站内 AI 生成/改写过的（aiLocked）勾死不可动 */}
                      <label
                        className={
                          'inline-flex items-center gap-1 text-xs text-muted-foreground ' +
                          (n.aiLocked ? 'cursor-not-allowed' : 'cursor-pointer')
                        }
                        title={
                          n.aiLocked
                            ? '这部作品由站内 AI 生成或修改过，声明不能取消'
                            : '勾选后读者会看到「AI 撰写」标记'
                        }
                      >
                        <input
                          type="checkbox"
                          checked={!!n.aiGenerated}
                          disabled={busySlug === n.slug || !!n.aiLocked}
                          onChange={(e) => handleToggleAi(n, e.target.checked)}
                          aria-label={`${n.title} 声明由 AI 撰写`}
                        />
                        AI 撰写{n.aiLocked ? '（锁定）' : ''}
                      </label>
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={busySlug === n.slug}
                        onClick={() => handlePublish(n)}
                      >
                        {n.status === 'published' ? '转草稿' : '发布'}
                      </Button>
                      {deletingSlug === n.slug ? (
                        <Button variant="destructive" size="xs" disabled={busySlug === n.slug} onClick={() => handleDelete(n)}>
                          确认删除
                        </Button>
                      ) : (
                        <Button variant="ghost" size="xs" onClick={() => setDeletingSlug(n.slug)}>
                          删除
                        </Button>
                      )}
                    </div>
                  </div>

                  {editing && (
                    <NovelEditor
                      key={`${n.slug}-${n.updatedAt}`} /* 改写后 source 变了，重挂编辑器拿新内容 */
                      novel={n}
                      busy={busySlug === n.slug}
                      onCancel={() => setEditingSlug(null)}
                      onSave={(next) => handleSaveEdit(n, next)}
                      onRefined={handleAiDone}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
