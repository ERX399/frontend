'use client';

/**
 * 读后评论（简版）。读者匿名，昵称可留可不留。
 *
 * 安全：内容以**纯文本**存储、用 React 文本节点渲染（不走 dangerouslySetInnerHTML），
 * 所以用户投稿里的标签和事件处理器不会被执行。
 */
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/icon';
import { fetchComments, postComment, type NovelComment } from '@/lib/webnovel/api/client';

const NICK_KEY = 'webnovel-nickname';

export function Comments({ slug }: { slug: string }) {
  const [items, setItems] = useState<NovelComment[]>([]);
  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetchComments(slug);
      setItems(r.items);
    } catch {
      // 评论拉不到不该打断阅读
    }
  }, [slug]);

  useEffect(() => {
    void load();
    try {
      setNickname(localStorage.getItem(NICK_KEY) || '');
    } catch {}
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      const r = await postComment(slug, text, nickname.trim() || undefined);
      setItems((prev) => [r.item, ...prev]);
      setContent('');
      try {
        // 记住昵称，下次不用重填
        if (nickname.trim()) localStorage.setItem(NICK_KEY, nickname.trim());
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : '发表失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 border-t border-border pt-5">
      <h3 className="text-base font-semibold mb-3 inline-flex items-center gap-1.5">
        <Icon icon="mdi:comment-outline" className="size-4" />
        读后感（{items.length}）
      </h3>

      <form onSubmit={submit} className="grid gap-2 mb-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="说点什么…（读到哪个结局？喜欢哪条分支？）"
          aria-label="评论内容"
          disabled={busy}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={24}
            placeholder="昵称（可留空）"
            aria-label="昵称"
            className="h-8 w-40 text-sm"
            disabled={busy}
          />
          <Button type="submit" size="sm" disabled={busy || !content.trim()}>
            {busy ? '发表中…' : '发表'}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">还没有人留言，来当第一个吧。</p>
      ) : (
        <ul className="border-t border-border">
          {items.map((c) => (
            <li key={c.id} className="border-b border-border py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{c.nickname || '匿名读者'}</span>
                <span className="font-mono">
                  {new Date(c.created_at * 1000).toLocaleString('zh-CN')}
                </span>
              </div>
              {/* 纯文本渲染：不解析 HTML，用户投稿无法执行脚本 */}
              <p className="mt-0.5 text-sm whitespace-pre-wrap break-words">{c.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
