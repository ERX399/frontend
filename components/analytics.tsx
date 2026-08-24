'use client';

import { useEffect } from 'react';
import { siteConfig } from '@/lib/config/site';

interface ConsentPreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
}

const STORAGE_KEY = 'cookie-consent-preferences';
const CONSENT_VERSION = '2.0';

function checkAnalyticsConsent(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.version === CONSENT_VERSION && data.preferences?.analytics) {
        return true;
      }
    }
  } catch {}
  return false;
}

export function Analytics() {
  useEffect(() => {
    // 必要追踪器（始终加载，不设 cookie 无需同意）
    loadUmami();
    loadCloudflare();

    // 检查已有 consent——如果用户之前同意过分析类 Cookie，直接加载
    if (checkAnalyticsConsent()) {
      loadBaidu();
      loadGoogle();
      loadClarity();
    }

    // 监听 Cookie Consent 更新事件（分析类追踪器需要用户同意）
    const handleConsentUpdate = (e: CustomEvent<ConsentPreferences>) => {
      const preferences = e.detail;
      if (preferences.analytics) {
        loadBaidu();
        loadGoogle();
        loadClarity();
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
  }, []);

  return null;
}

function loadUmami() {
  const src = siteConfig.analytics.umami.src;
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement('script');
  script.defer = true;
  script.src = src;
  script.setAttribute('data-website-id', siteConfig.analytics.umami.websiteId);
  document.head.appendChild(script);
}

function loadCloudflare() {
  const src = 'https://static.cloudflareinsights.com/beacon.min.js';
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement('script');
  script.defer = true;
  script.src = src;
  script.setAttribute(
    'data-cf-beacon',
    JSON.stringify({ token: siteConfig.analytics.cfWebAnalytics.token }),
  );
  document.head.appendChild(script);
}


function loadBaidu() {
  const id = siteConfig.analytics.baidu.id;
  if (document.querySelector(`script[src*="hm.baidu.com"]`)) return;
  const script = document.createElement('script');
  script.innerHTML = `
    var _hmt = _hmt || [];
    (function() {
      var hm = document.createElement("script");
      hm.src = "https://hm.baidu.com/hm.js?${id}";
      var s = document.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(hm, s);
    })();
  `;
  document.head.appendChild(script);
}

function loadGoogle() {
  const id = siteConfig.analytics.google.measurementId;
  if (document.querySelector(`script[src*="googletagmanager"]`)) return;

  const gtagScript = document.createElement('script');
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(gtagScript);

  const initScript = document.createElement('script');
  initScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${id}');
  `;
  document.head.appendChild(initScript);
}

function loadClarity() {
  const id = siteConfig.analytics.clarity.projectId;
  if (document.querySelector(`script[src*="clarity.ms"]`)) return;
  const script = document.createElement('script');
  script.innerHTML = `
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${id}");
  `;
  document.head.appendChild(script);
}
