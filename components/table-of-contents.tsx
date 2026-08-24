"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  className?: string;
  /** 点了目录条目后的回调（如关掉抽屉）——不关的话目标标题被 70vh 抽屉 + 遮罩盖住，跳了也看不见 */
  onNavigate?: () => void;
}

export function TableOfContents({ className, onNavigate }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const activeRef = useRef(activeId);
  activeRef.current = activeId;

  // 扫描文章区域获取标题（支持客户端动态渲染的内容）
  useEffect(() => {
    const scan = () => {
      const els = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
      const arr: Heading[] = [];
      els.forEach((el) => {
        if (el.id) {
          arr.push({
            id: el.id,
            text: el.textContent || "",
            level: parseInt(el.tagName.charAt(1)),
          });
        }
      });
      setHeadings(arr);
    };

    // 初始扫描
    scan();

    // 监听文章内容变化（PostBody 是客户端动态渲染的）
    const article = document.querySelector("article");
    if (article) {
      const observer = new MutationObserver(() => scan());
      observer.observe(article, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    if (headings.length === 0) return;

    const update = () => {
      let best = "";
      // 与 PostToc 一致：当前章节 = 最后一个 top 越过阈值线的标题。
      // `<= THRESHOLD + 1` 吸收 scroll-margin 落地的亚像素取整（79.5~80.5），
      // 否则点第二集可能高亮到第三集。阈值对齐 scroll-mt-20 的 80px。
      const THRESHOLD = 80;
      let bestTop = -Infinity;

      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= THRESHOLD + 1 && top > bestTop) {
          bestTop = top;
          best = h.id;
        }
      }

      // 页首还没滚到任何标题时，退到第一个在阈值线之下的标题
      if (!best) {
        bestTop = Infinity;
        for (const h of headings) {
          const el = document.getElementById(h.id);
          if (!el) continue;
          const top = el.getBoundingClientRect().top;
          if (top >= THRESHOLD && top < bestTop) {
            bestTop = top;
            best = h.id;
          }
        }
      }

      if (!best && headings.length > 0) best = headings[0].id;

      if (best && best !== activeRef.current) setActiveId(best);
    };

    window.addEventListener("scroll", update, { passive: true });
    update();

    return () => window.removeEventListener("scroll", update);
  }, [headings]);

  if (headings.length === 0) return null;

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <div className={cn("font-mono", className)}>
      <h4 className="mb-3 border-b border-border pb-2 text-xs font-medium tracking-widest text-muted-foreground uppercase">
        本页目录
      </h4>
      <nav>
        <ul className="space-y-px">
          {headings.map((heading) => {
            const depth = Math.max(0, heading.level - minLevel);
            const active = activeId === heading.id;
            return (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  onClick={() => {
                    // 不 preventDefault：滚动交给浏览器原生锚点导航（精确、不累积偏移）。
                    // 这里只负责关抽屉。
                    onNavigate?.();
                  }}
                  className={cn(
                    "flex items-baseline gap-1.5 py-1 pr-1.5 text-left leading-snug no-underline transition-colors duration-75",
                    // 层级区分：字号 / 颜色 / 字重逐级递减
                    depth === 0 && "text-sm font-medium text-foreground/90",
                    depth === 1 && "text-[13px] text-muted-foreground",
                    depth >= 2 && "text-xs text-muted-foreground/80",
                    // 反色选中块 = 终端选区
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-foreground hover:text-background",
                  )}
                  style={{ paddingLeft: `${0.375 + depth * 0.75}rem` }}
                >
                  {/* Markdown 式层级前缀，一眼分辨标题级别 */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "shrink-0 text-[0.85em] select-none",
                      active ? "text-primary-foreground/60" : "text-muted-foreground/40",
                    )}
                  >
                    {"#".repeat(heading.level)}
                  </span>
                  <span className="min-w-0">{heading.text}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
