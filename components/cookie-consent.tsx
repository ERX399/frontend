'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { COOKIE_PREFERENCES_LABEL } from '@/lib/constants';

type CookieView = 'banner' | 'settings' | null;

interface ConsentPreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
}

const STORAGE_KEY = 'cookie-consent-preferences';
const CONSENT_VERSION = '2.0';

function loadPreferences(): { prefs: ConsentPreferences; agreed: boolean } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.version === CONSENT_VERSION && data.agreed) {
        return { prefs: data.preferences, agreed: true };
      }
    }
  } catch {}
  return null;
}

function savePreferencesToStorage(preferences: ConsentPreferences) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: CONSENT_VERSION,
        preferences,
        agreed: true,
        timestamp: Date.now(),
      }),
    );
  } catch {}
}

export function CookieConsent() {
  const [view, setView] = useState<CookieView | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    functional: false,
    analytics: false,
  });

  // Apply consent by dispatching event
  const applyConsent = useCallback((prefs: ConsentPreferences) => {
    window.dispatchEvent(
      new CustomEvent('cookie-consent-updated', { detail: prefs }),
    );
  }, []);

  const saveSettings = useCallback(
    (prefs: ConsentPreferences) => {
      savePreferencesToStorage(prefs);
      applyConsent(prefs);
    },
    [applyConsent],
  );

  const acceptAll = useCallback(() => {
    const prefs = { necessary: true, functional: true, analytics: true };
    setPreferences(prefs);
    saveSettings(prefs);
    setView(null);
  }, [saveSettings]);

  const acceptNecessary = useCallback(() => {
    const prefs = { necessary: true, functional: false, analytics: false };
    setPreferences(prefs);
    saveSettings(prefs);
    setView(null);
  }, [saveSettings]);

  const saveCustomSettings = useCallback(() => {
    const prefs = { ...preferences, necessary: true };
    setPreferences(prefs);
    saveSettings(prefs);
    setView(null);
  }, [preferences, saveSettings]);

  const withdrawConsent = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setAgreed(false);
    setView('banner');
  }, []);

  const goToSettings = useCallback(() => {
    setView('settings');
  }, []);

  const closeSettings = useCallback(() => {
    setView(null);
  }, []);

  const goBackToBanner = useCallback(() => {
    setView('banner');
  }, []);

  // Handle open_preferences_center clicks
  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target.id === 'open_preferences_center' ||
        target.closest('#open_preferences_center')
      ) {
        e.preventDefault();
        goToSettings();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [goToSettings]);

  // Init：只读 localStorage。
  // 以前这里还会读写 ?cookie=banner|settings —— 首次访问必定 replaceState
  // 把参数写进地址栏，用户复制链接就带着它，白白污染每一个 URL。
  // 弹窗是模态的，本来也不需要可分享的深链；入口走 #open_preferences_center。
  useEffect(() => {
    const existing = loadPreferences();
    if (!existing) {
      setView('banner');
    } else {
      setPreferences(existing.prefs);
      setAgreed(true);
    }
  }, []);

  return (
    <>
      {/* Banner */}
      {view === 'banner' && (
        <div className="fixed inset-0 z-50 bg-background/80">
          {/* 手机上横幅整块贴到屏幕底边：外层不留内边距，卡片自己去掉左右和
              底边的框（下边缘就是屏幕边缘，那条线没有意义）。md 起恢复成浮块。
              这里必须显式写 mx-0 —— Card 默认带 -mx-4 是为了抵消页面容器的
              px-4，而这个外层在手机上没有 px，照搬就会横向溢出 16px */}
          <div className="fixed bottom-0 left-0 right-0 p-0 md:p-6">
            <Card className="mx-0 max-w-3xl border-b-0 md:mx-auto md:border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Icon icon="mdi:cookie" className="h-5 w-5" />
                  隐私与协议
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-3">
                  继续使用本网站即表示你同意以下协议及隐私政策中所述的 Cookie
                  使用方式。
                </p>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    点击&quot;接受全部&quot;即表示您同意我们使用所有
                    Cookie，您也可以点击&quot;自定义设置&quot;来选择您希望启用的
                    Cookie 类型。
                  </p>

                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={agreed}
                      onCheckedChange={(c) => setAgreed(!!c)}
                      id="agree-checkbox"
                    />
                    <Label htmlFor="agree-checkbox">
                      我已阅读并同意
                      <a
                        href="/agree"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-primary hover:no-underline inline mx-1"
                      >
                        《用户协议》
                      </a>
                      和
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-primary hover:no-underline inline ml-1"
                      >
                        《隐私政策》
                      </a>
                    </Label>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={acceptAll} disabled={!agreed}>
                      <Icon icon="mdi:check-all" className="mr-2 h-4 w-4" />
                      接受全部
                    </Button>
                    <Button
                      variant="outline"
                      onClick={acceptNecessary}
                      disabled={!agreed}
                    >
                      仅必要 Cookie
                    </Button>
                    <Button
                      variant="outline"
                      onClick={goToSettings}
                      disabled={!agreed}
                    >
                      <Icon icon="mdi:cog" className="mr-2 h-4 w-4" />
                      自定义设置
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Settings Dialog */}
      {view === 'settings' && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">{COOKIE_PREFERENCES_LABEL}</h2>
              <button
                type="button"
                className="text-muted-foreground hover:text-background p-2 rounded-md hover:bg-foreground"
                onClick={closeSettings}
              >
                <Icon icon="mdi:close" className="size-7" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              请阅读并同意用户协议与隐私政策，并选择您希望启用的 Cookie
              类型。必要 Cookie 无法禁用。
            </p>

            <div className="space-y-6 py-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={agreed}
                  onCheckedChange={(c) => setAgreed(!!c)}
                  id="agree-checkbox-dialog"
                />
                <Label htmlFor="agree-checkbox-dialog">
                  我已阅读并同意
                  <a
                    href="/agree"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-primary hover:no-underline inline mx-1"
                  >
                    《用户协议》
                  </a>
                  和
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-primary hover:no-underline inline ml-1"
                  >
                    《隐私政策》
                  </a>
                </Label>
              </div>

              {/* Necessary */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox checked={true} disabled={true} className="mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold">必要 Cookie</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-2">
                      这些 Cookie 对于网站的基本功能是必需的，无法禁用。
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Umami Analytics - 网站统计</li>
                      <li>CDN 性能监控</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Functional */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={preferences.functional}
                    onCheckedChange={(c) =>
                      setPreferences((p) => ({ ...p, functional: !!c }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">功能性 Cookie</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-2">
                      这些 Cookie 用于增强网站功能和个性化体验。
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Giscus - 评论系统</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Analytics */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={preferences.analytics}
                    onCheckedChange={(c) =>
                      setPreferences((p) => ({ ...p, analytics: !!c }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">分析 Cookie</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-2">
                      这些 Cookie 帮助我们了解访问者如何使用网站，以便改进用户体验。
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>百度统计 - 访问分析</li>
                      <li>Google Analytics - 用户行为分析</li>
                      <li>Microsoft Clarity - 用户体验分析</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-2 items-center">
              <Button
                variant="destructive"
                className="w-full max-w-xs"
                onClick={withdrawConsent}
              >
                <Icon icon="mdi:close-circle-outline" className="size-4 mr-1" />
                撤回同意
              </Button>
              <Button
                className="w-full max-w-xs"
                onClick={saveCustomSettings}
                disabled={!agreed}
              >
                保存设置
              </Button>
              <Button variant="outline" className="w-full max-w-xs" onClick={goBackToBanner}>
                返回
              </Button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
