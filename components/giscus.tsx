'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { siteConfig } from '@/lib/config/site';

const STORAGE_KEY = 'cookie-consent-preferences';
const CONSENT_VERSION = '2.0';

/* 自定义主题（public/giscus-shell.css）。giscus 在 https iframe 内加载该样式表，
   主题地址必须能命中真正发布的 css：跟随当前页面 origin，本地 dev 指
   http://127.0.0.1:5174/giscus-shell.css，线上指 https://blog.520pro.top/giscus-shell.css。 */
const GISCUS_THEME = `${window.location.origin}/giscus-shell.css`;

const GISCUS_CONFIG = {
  src: 'https://giscus.app/client.js',
  'data-repo': siteConfig.giscus.repo,
  'data-repo-id': siteConfig.giscus.repoId,
  'data-category': siteConfig.giscus.category,
  'data-category-id': siteConfig.giscus.categoryId,
  'data-mapping': 'pathname',
  'data-strict': '1',
  'data-reactions-enabled': '1',
  'data-emit-metadata': '0',
  'data-input-position': 'top',
  'data-lang': 'zh-CN',
  /* **不要改回 lazy。** 这个值被 giscus 透传成 iframe 的 loading 属性，lazy 时
     要等评论区滚进视口附近才开始加载，而 giscus 自己从建连到渲染完要 2~3 秒
     —— 结果就是用户滑到底想评论，看到的是一片空白，然后 iframe 才慢慢长出来。
     省下的那一个请求换不来这个体验。eager 让它在页面加载时就并行开始，
     用户滑到底时通常已经好了。 */
  'data-loading': 'eager',
  crossorigin: 'anonymous',
};

function checkFunctionalConsent(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.version === CONSENT_VERSION && data.preferences?.functional) {
        return true;
      }
    }
  } catch {}
  return false;
}

export function Giscus() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  /**
   * 已经为哪个路径注入过 giscus。
   *
   * `data-mapping: pathname` 意味着评论串是按 URL 路径绑定的，而文章底部的
   * 「上一篇 / 下一篇」是 <Link>（客户端导航）—— 路由参数变了但组件不重挂。
   * 原先这里是个布尔量 `scriptInjected`，注入过就永不再注入，于是从 A 篇跳到
   * B 篇后，页面是 B 的、评论区还挂着 A 的讨论串（`data-strict: 1` 下评论会
   * 直接发到 A 底下）。改存路径，路径变了就重新注入。
   */
  const loadedPath = useRef<string | null>(null);
  const { pathname } = useLocation();

  const loadGiscus = useCallback(() => {
    if (!containerRef.current || loadedPath.current === pathname) return;
    loadedPath.current = pathname;

    const container = containerRef.current;
    // 换文章时先清掉上一篇的 iframe
    container.innerHTML = '';

    const script = document.createElement('script');
    for (const [attr, value] of Object.entries(GISCUS_CONFIG)) {
      script.setAttribute(attr, value);
    }
    script.setAttribute('data-theme', GISCUS_THEME);
    script.async = true;
    container.appendChild(script);
    setLoaded(true);
  }, [pathname]);

  // 挂载 + 每次换文章：有同意就（重新）注入
  useEffect(() => {
    if (checkFunctionalConsent()) {
      loadGiscus();
    }

    const handleConsentUpdate = (e: CustomEvent) => {
      const preferences = e.detail;
      if (preferences.functional) {
        loadGiscus();
      }
    };

    window.addEventListener(
      'cookie-consent-updated',
      handleConsentUpdate as EventListener,
    );

    return () => {
      window.removeEventListener(
        'cookie-consent-updated',
        handleConsentUpdate as EventListener,
      );
    };
  }, [loadGiscus]);

  // Sync theme after loaded
  useEffect(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          giscus: {
            setConfig: {
              theme: GISCUS_THEME,
            },
          },
        },
        'https://giscus.app',
      );
    }
  }, []);

  return (
    <div className="mt-12">
      <div className="flex items-center gap-3 pb-6">
        <a
          href={`https://github.com/${siteConfig.giscus.repo}/discussions`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon icon="mdi:github" className="size-4" />
          跳转到讨论仓库
        </a>
      </div>
      <div className="border-t pt-8">
        {!loaded && (
          <div className="flex items-start gap-3 rounded-lg border p-4 text-sm">
            <Icon
              icon="mdi:information-outline"
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            />
            <div>
              <p className="font-medium">评论功能需要启用功能性 Cookie</p>
              <p className="text-muted-foreground mt-1">
                请在{' '}
                <a
                  href="#"
                  id="open_preferences_center"
                  className="text-primary underline"
                >
                  Cookie 设置
                </a>{' '}
                中启用
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="pt-6" ref={containerRef} />
    </div>
  );
}
