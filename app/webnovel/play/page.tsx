'use client';

/**
 * 阅读器（阶段 1，milovana 语义）。
 *
 * 页面 = 内容(image/say 累积) + 计时闸门(normal/secret/hidden) + 出口(choice/goto/end)。
 * 条件控制选项隐藏/锁定；进度实时写 localStorage（webnovel:<slug>）断点续读。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { Button, buttonVariants } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { webnovelImageUrl } from '@/lib/webnovel/api/client';
import { LikeButton } from '@/components/webnovel/like-button';
import { Comments } from '@/components/webnovel/comments';
import { useNovelRuntime } from '@/lib/webnovel/engine/useNovelRuntime';

function TimerBar({ remaining, total, style }: { remaining: number; total: number; style: string }) {
  if (style === 'hidden') return null;
  const pct = Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  return (
    <div className="my-4">
      <div className="h-1.5 w-full border border-border bg-background">
        <div className="h-full bg-foreground transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
      {style === 'normal' && (
        <p className="mt-1 text-xs text-muted-foreground font-mono">等待中 {Math.ceil(remaining)} 秒</p>
      )}
    </div>
  );
}

export default function WebnovelPlayPage() {
  const { slug } = useParams<{ slug: string }>();
  const { status, novel, view, pickOption, continueGoto, restart, acquired, dismissAcquired } =
    useNovelRuntime(slug || '');
  const [bagOpen, setBagOpen] = useState(false);

  // 获得道具的提示 3.5 秒后自动消失（也可点掉）
  useEffect(() => {
    if (acquired.length === 0) return;
    const t = setTimeout(dismissAcquired, 3500);
    return () => clearTimeout(t);
  }, [acquired, dismissAcquired]);

  // 全屏：对整个阅读容器请求全屏，沉浸阅读。跟随浏览器的全屏状态（ESC 退出也同步）
  const shellRef = useRef<HTMLDivElement>(null);
  const [isFull, setIsFull] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shellRef.current?.requestFullscreen();
    } catch {
      // iOS Safari 等不支持 Element.requestFullscreen 时静默忽略
    }
  }, []);

  // 计时结束自动跳转：出口是 goto 且作者勾了「自动跳转」时，不等玩家点「继续」。
  // 放在组件顶层（hooks 不能在早退分支之后调用），条件写在 effect 内部。
  const autoGoto =
    view && view.outletReady && view.autoAdvance && view.outletKind === 'goto' ? view.gotoTarget : null;
  useEffect(() => {
    if (!autoGoto) return;
    // 微小延迟：让「时间到」的那一帧先画出来，跳转不至于突兀
    const t = setTimeout(() => continueGoto(autoGoto), 260);
    return () => clearTimeout(t);
  }, [autoGoto, continueGoto]);

  if (status === 'loading') {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <Spinner className="mx-auto" />
        <p className="mt-3 text-sm text-muted-foreground">加载作品…</p>
      </div>
    );
  }

  if (status === 'missing' || !novel) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <Icon icon="mdi:book-alert" className="mx-auto size-8" />
        <h2 className="mt-3 text-lg font-semibold">作品不存在或已下架</h2>
        <Link to="/webnovel" className="mt-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Icon icon="mdi:arrow-left" className="size-4" />
          返回列表
        </Link>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
        作者还没有添加任何关卡。
        <Link to={`/webnovel/${novel.slug}`} className="block mt-3 text-sm underline">
          返回作品详情
        </Link>
      </div>
    );
  }

  const { outletReady, outletKind, gotoTarget, options, timer } = view;

  return (
    <div
      ref={shellRef}
      /* 全屏时容器自身变成视口，补上背景色与内边距（否则全屏后是透明底 + 贴边） */
      className={
        isFull
          ? 'h-screen w-screen overflow-y-auto bg-background px-4 py-6'
          : 'container mx-auto max-w-2xl px-4 py-6'
      }
    >
      <div className={isFull ? 'mx-auto max-w-2xl' : ''}>
      <div className="flex items-center justify-between gap-3 mb-4 text-sm text-muted-foreground">
        <Link to={`/webnovel/${novel.slug}`} className="inline-flex items-center gap-1 hover:text-foreground">
          <Icon icon="mdi:arrow-left" className="size-4" />
          {novel.title}
        </Link>
        <span className="flex items-center gap-3 shrink-0">
          {/* 背包：让玩家随时看清自己有什么、能干嘛 */}
          <button
            type="button"
            onClick={() => setBagOpen((v) => !v)}
            className="inline-flex items-center gap-1 hover:text-foreground"
            aria-label="背包"
            aria-pressed={bagOpen}
          >
            <Icon icon="mdi:bag-personal-outline" className="size-5" />
            {view.inventory.length > 0 && <span className="font-mono">{view.inventory.length}</span>}
          </button>
          {/* 随时可重来，不必走到结局（走错分支卡住时尤其需要） */}
          <button
            type="button"
            onClick={() => {
              if (confirm('重新开始？当前进度和已获得的道具都会清空。')) restart();
            }}
            className="inline-flex items-center gap-1 hover:text-foreground"
            aria-label="重新开始"
            title="重新开始"
          >
            <Icon icon="mdi:restart" className="size-5" />
          </button>
          <span>
            已探索 {view.visitedCount}/{view.totalPages} 页
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1 hover:text-foreground"
            aria-label={isFull ? '退出全屏' : '全屏阅读'}
            title={isFull ? '退出全屏' : '全屏阅读'}
          >
            <Icon icon={isFull ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'} className="size-5" />
          </button>
        </span>
      </div>

      {/* 背包面板 */}
      {bagOpen && (
        <div className="mb-3 border border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold inline-flex items-center gap-1.5">
              <Icon icon="mdi:bag-personal-outline" className="size-4" />
              背包（{view.inventory.length}）
            </h3>
            <button
              type="button"
              onClick={() => setBagOpen(false)}
              aria-label="关闭背包"
              className="text-muted-foreground hover:text-foreground"
            >
              <Icon icon="mdi:close" className="size-4" />
            </button>
          </div>
          {view.inventory.length === 0 ? (
            <p className="text-xs text-muted-foreground">还没有获得任何道具。</p>
          ) : (
            <ul className="space-y-1.5">
              {view.inventory.map((it) => (
                <li key={it.name} className="border-b border-border pb-1.5 last:border-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{it.label}</span>
                    {it.quantity !== null && (
                      <span className="text-[11px] font-mono bg-secondary text-secondary-foreground px-1.5">
                        {it.quantity}
                      </span>
                    )}
                  </div>
                  {it.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{it.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 获得道具提示：拿到东西的那一刻必须让玩家看见 */}
      {acquired.length > 0 && (
        <button
          type="button"
          onClick={dismissAcquired}
          className="mb-3 block w-full border border-foreground bg-foreground px-3 py-2 text-left text-background"
        >
          {acquired.map((it) => (
            <span key={it.name} className="flex items-center gap-2 text-sm">
              <Icon icon="mdi:package-variant-closed" className="size-4 shrink-0" />
              <span>
                获得道具：<b>{it.label}</b>
                {it.description ? ` —— ${it.description}` : ''}
              </span>
            </span>
          ))}
        </button>
      )}

      <article className="border-y border-border py-5 min-h-[40vh]">
        {view.title && <h2 className="text-lg font-bold mb-3">{view.title}</h2>}
        {view.images.map((img, i) => (
          <img
            key={i}
            src={webnovelImageUrl(img)}
            alt=""
            /* 原比例展示：object-contain + h/w auto，不裁剪不拉伸。
               高度封顶 70vh —— 竖长图（比例异常）最多占七成视口，
               剩下三成留给正文和选项，图片永远挤不掉文字。 */
            className="mx-auto mb-4 block h-auto max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
            loading="lazy"
            decoding="async"
          />
        ))}
        {view.texts.map((t, i) => (
          <p
            key={i}
            className={`whitespace-pre-wrap break-words ${t.align && t.align !== 'left' ? `text-${t.align}` : ''} ${i > 0 ? 'mt-3' : ''}`}
          >
            {t.text}
          </p>
        ))}
        {view.texts.length === 0 && view.images.length === 0 && (
          <p className="text-muted-foreground">（本页没有内容）</p>
        )}

        {/* 计时闸门 */}
        {timer && <TimerBar remaining={timer.remaining} total={timer.total} style={timer.style} />}
        {timer && !outletReady && timer.style === 'hidden' && (
          <p className="text-xs text-muted-foreground text-center py-2">…</p>
        )}
      </article>

      <div className="py-4">
        {!outletReady ? null : outletKind === 'choice' ? (
          <div className="flex flex-col gap-2">
            {options.map(({ opt, locked, lockLabel, choiceActionId }) => (
              <div key={opt.id}>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start whitespace-normal h-auto py-2.5"
                  disabled={locked}
                  onClick={() => pickOption(choiceActionId, opt.id)}
                  data-choice-id={opt.id}
                >
                  <Icon icon={locked ? 'mdi:lock' : 'mdi:chevron-right'} className="size-4 shrink-0" />
                  {opt.label}
                </Button>
                {locked && lockLabel && (
                  <p className="mt-0.5 px-3 text-xs text-muted-foreground">🔒 {lockLabel}</p>
                )}
              </div>
            ))}
            {options.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">（没有可选的选项，卡在页尾。）</p>
            )}
          </div>
        ) : outletKind === 'goto' && gotoTarget ? (
          view.autoAdvance ? (
            // 自动跳转中：不给按钮，避免玩家点了又被 effect 再跳一次
            <p className="text-sm text-muted-foreground">…</p>
          ) : (
            <Button size="lg" className="w-full sm:w-auto" onClick={() => continueGoto(gotoTarget!)}>
              继续
              <Icon icon="mdi:chevron-right" className="size-5" />
            </Button>
          )
        ) : outletKind === 'end' ? (
          <div className="flex flex-col items-start gap-3">
            {/* 读完这一刻最想表达喜欢 —— 详情页那次是"读前"，这里是"读后" */}
            <LikeButton slug={novel.slug} initialLikes={novel.likeCount} />
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="lg" onClick={restart}>
                <Icon icon="mdi:restart" className="size-5" />
                剧终 · 重新开始
              </Button>
              <Link to="/webnovel" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                返回列表
              </Link>
            </div>
            {/* 读完才出现：这时才有话可说 */}
            <div className="w-full">
              <Comments slug={novel.slug} />
            </div>
          </div>
        ) : (
          <Button size="lg" className="w-full sm:w-auto" onClick={restart}>
            <Icon icon="mdi:restart" className="size-5" />
            剧终 · 重新开始
          </Button>
        )}
      </div>
      </div>
    </div>
  );
}
