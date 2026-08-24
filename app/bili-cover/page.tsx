import { useCallback, useEffect, useState } from 'react';
import { Form, Link, useNavigation } from 'react-router';
import { track } from '@/lib/track';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const EXAMPLES = [
  '【请品尝我的温度【达妮娅原创曲PV】-哔哩哔哩】 https://b23.tv/HhM3o5U',
  'https://b23.tv/HhM3o5U',
  'https://www.bilibili.com/video/BV1euGm6REkb',
  'BV1euGm6REkb',
  'HhM3o5U',
];

export interface BiliCoverResult {
  /** 回填输入框用的原始查询串 */
  input: string;
  pic: string;
  error: string;
}

function exampleHref(example: string): string {
  return `/bili-cover?url=${encodeURIComponent(example)}`;
}

/**
 * 解析走 loader（`app/lib/bili-cover.server.ts`），不再由浏览器跨域请求
 * `bili-pic.2x.nz` —— 那个域名一挂整页就废，而且禁用 JS 时这页只是一块死界面。
 * 现在是一个普通的 GET 表单：无 JS 时整页刷新出结果，有 JS 时 RR 走客户端导航。
 */
export default function BiliCoverPage({ result }: { result?: BiliCoverResult } = {}) {
  const { input = '', pic = '', error = '' } = result ?? {};
  const navigation = useNavigation();
  const loading = navigation.state !== 'idle';
  const [copied, setCopied] = useState(false);

  // 和站内搜索同理：解析走 loader，埋点挂在结果上，整页刷新和客户端导航都算得到。
  // 只报成功/失败，不报用户贴进来的链接
  useEffect(() => {
    if (!input) return;
    track('使用工具', { 工具: 'B站封面', 动作: '解析', 结果: pic ? '成功' : '失败' });
  }, [input, pic]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板被浏览器拒绝时不做处理：旁边就有「打开原图」可以手动复制
    }
  }, [pic]);

  return (
    <main className="container mx-auto max-w-2xl px-4 py-12 space-y-6">
      {/* 页面标题走 CardTitle（视觉），但那不是 h1 —— 补一个 sr-only h1
          让文档有唯一的一级标题 */}
      <h1 className="sr-only">B站视频封面获取</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Icon icon="mdi:image-search" className="size-6 text-primary" />
            B站封面提取
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            支持 BV 号、AV 号、b23.tv 短链、bilibili.com 完整链接，粘贴即可识别。
          </p>

          <p className="text-xs text-muted-foreground/60 leading-relaxed italic">
            TMD市面上各种啥比B站封面提取网站都TM做的什么玩意，要不没法提取b23，要不没法提取一串文本内的URL。还有TM收费的，不是哥们，你们真神了。既然如此，我自己做。
          </p>

          {/* 示例是真链接而不是 onClick 填表：无 JS 时照样能点开看效果 */}
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <Link
                key={example}
                to={exampleHref(example)}
                className="px-2.5 py-1 border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                {example.length > 40 ? example.slice(0, 38) + '…' : example}
              </Link>
            ))}
          </div>

          <Form method="get" action="/bili-cover" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bili-url">视频链接 / AV / BV / b23 短码</Label>
              {/* key：换示例时 URL 变了，但非受控 input 的 DOM value 不会跟着变，
                  重挂载才能把新的 defaultValue 吃进去 */}
              <input
                key={input}
                id="bili-url"
                name="url"
                type="text"
                defaultValue={input}
                placeholder="粘贴链接或输入短码"
                className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Button type="submit" disabled={loading}>
              <Icon icon="mdi:search" className="size-4" />
              {loading ? '获取中...' : '提取封面'}
            </Button>
          </Form>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-2 border-y border-border py-4 sm:border sm:p-4">
          <Icon icon="mdi:alert-circle-outline" className="size-4 shrink-0" />
          {error}
        </p>
      )}

      {pic && (
        <div className="space-y-4 border-t border-border pt-6">
          <a href={pic} target="_blank" rel="noopener noreferrer" className="block">
            {/* referrerPolicy=no-referrer：hdslb 对带 referer 的请求做防盗链 */}
            <img
              src={pic}
              alt="B站封面"
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              className="w-full border"
            />
          </a>
          <div className="flex gap-2">
            <a href={pic} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button className="w-full">
                <Icon icon="mdi:open-in-new" className="size-4" />
                打开原图
              </Button>
            </a>
            <Button variant="outline" onClick={copyToClipboard}>
              <Icon icon={copied ? 'mdi:check' : 'mdi:content-copy'} className="size-4" />
              {copied ? '已复制' : '复制链接'}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
