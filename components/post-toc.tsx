"use client";

import { useEffect, useRef, useState } from "react";
import type { TocItem } from "@/../app/lib/build-toc";

/**
 * 博客文章目录侧栏（SSR 直出标题数据，客户端加 scroll-spy 高亮）。
 * 与 TableOfContents 不同：不需要 DOM 扫描，标题由服务端 buildToc() 提供。
 */
export function PostToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");
  const activeRef = useRef(activeId);
  activeRef.current = activeId;

  useEffect(() => {
    if (items.length === 0) return;

    const THRESHOLD = 80; // 与 prose-headings:scroll-mt-20 (5rem) 对齐

    const update = () => {
      let best = "";
      // 当前章节 = 最后一个 top 越过阈值线的标题。
      // 用 `top <= THRESHOLD + 1` 而不是 `top >= THRESHOLD`：scroll-margin 落地的
      // 亚像素取整会让标题停在 79.5~80.5px，旧逻辑 `>= 80` 在落在 79.7 时把
      // 当前标题当成「已滚过」，于是高亮到下一节（点第二集高亮第三集）。
      let bestTop = -Infinity;
      for (const h of items) {
        const el = document.getElementById(h.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= THRESHOLD + 1 && top > bestTop) {
          bestTop = top;
          best = h.id;
        }
      }

      // 页首还没滚到任何标题、或目标在页尾滚不到阈值线时，退到第一个在
      // 阈值线之下的标题
      if (!best) {
        bestTop = Infinity;
        for (const h of items) {
          const el = document.getElementById(h.id);
          if (!el) continue;
          const top = el.getBoundingClientRect().top;
          if (top >= THRESHOLD && top < bestTop) {
            bestTop = top;
            best = h.id;
          }
        }
      }

      // 兜底：没有任何匹配时高亮第一个
      if (!best && items.length > 0) best = items[0].id;

      if (best && best !== activeRef.current) setActiveId(best);
    };

    window.addEventListener("scroll", update, { passive: true });
    update(); // 页面加载后立即跑一次（处理带 hash 锚点进入的情况）

    return () => window.removeEventListener("scroll", update);
  }, [items]);

  if (items.length === 0) return null;

  return (
    <aside className="hidden lg:block w-[320px] flex-shrink-0 sticky top-20 self-start">
      {/* 与正文一致的去卡片处理：边界只用一条竖线交代 */}
      <div className="border-l border-border pl-4">
        <p className="text-sm font-medium mb-3 text-muted-foreground">目录</p>
        <ul className="space-y-1.5 text-sm leading-relaxed">
          {items.map((h) => {
            const active = activeId === h.id;
            return (
              <li key={h.id} className={h.level === 3 ? "pl-4" : ""}>
                {/* 纯原生锚点：不 preventDefault、不 JS 滚动。浏览器原生的 fragment
                    导航精确落在标题（尊重 scroll-mt-20），连续点击不累积偏移。
                    有 JS 和无 JS 走同一条路径。 */}
                <a
                  href={`#${h.id}`}
                  className={`block truncate px-2 -mx-2 py-0.5 transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-foreground hover:text-background"
                  }`}
                >
                  {h.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
