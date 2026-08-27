import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router';
import RootLayout from '@/layouts/root-layout';
import { redirects } from '@/lib/redirects';
import { RedirectPageClient } from '@/app/[...slug]/redirect-page-client';

// 首页保持同步加载：绝大多数首次访问落在 /，避免「入口 JS → 再拉页面 chunk」的二次往返
import HomePage from '@/app/page';

// 其余页面全部路由级懒加载（route.lazy），导航时才拉取对应 chunk；
// React Router 会在 chunk 加载完成前停留在当前页面，不产生空白/闪烁
const page = (load: () => Promise<{ default: React.ComponentType }>) =>
  async () => ({ Component: (await load()).default });

function NotFoundPage() {
  return (
    <main className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-muted-foreground mb-8">页面未找到</p>
      <a href="/" className="text-primary hover:underline">返回首页</a>
    </main>
  );
}

/**
 * 全站规范形态为「无尾斜杠」：/posts/x 而非 /posts/x/。
 * 边缘 Worker 已对带斜杠请求做 301，这里只兜底 SPA 内部导航（history API 不经边缘）。
 * 统一形态同时保证浏览量统计不会因两种写法被记成两条。
 */
function TrailingSlashRedirect() {
  // hash 必须一并保留：GitHub OAuth 回调通过 #token=... 回传凭证，丢掉会导致登录失败
  const { pathname, search, hash } = useLocation();
  if (pathname !== '/' && pathname.endsWith('/')) {
    return <Navigate to={pathname.replace(/\/+$/, '') + search + hash} replace />;
  }
  return <Outlet />;
}

const redirectRoutes = Object.entries(redirects).map(([path, dest]) => ({
  path: path.slice(1),
  element: <RedirectPageClient destination={dest} />,
}));

export const router = createBrowserRouter([
  {
    element: <TrailingSlashRedirect />,
    HydrateFallback: () => null,
    children: [
      {
        element: <RootLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'posts', lazy: page(() => import('@/app/posts/page')) },
          { path: 'posts/:slug', lazy: page(() => import('@/app/posts/[slug]/page')) },
          { path: 'friends', lazy: page(() => import('@/app/friends/page')) },
          { path: 'sponsors', lazy: page(() => import('@/app/sponsors/page')) },
          { path: 'files', lazy: page(() => import('@/app/files/page')) },
          { path: 'cover', lazy: page(() => import('@/app/cover/page')) },
          { path: 'watermark', lazy: page(() => import('@/app/watermark/page')) },
          { path: 'convert', lazy: page(() => import('@/app/convert/page')) },
          { path: 'bili-cover', lazy: page(() => import('@/app/bili-cover/page')) },
          { path: 'tier', lazy: page(() => import('@/app/tier/page')) },
          { path: 'privacy', lazy: page(() => import('@/app/privacy/page')) },
          { path: 'agree', lazy: page(() => import('@/app/agree/page')) },
          {
            // ForumProvider（及其静态依赖的论坛 API client）随论坛路由懒加载，不进入口
            lazy: async () => {
              const { ForumProvider } = await import('@/app/forum/forum-provider');
              return {
                Component: function ForumLayout() {
                  return <ForumProvider><Outlet /></ForumProvider>;
                },
              };
            },
            children: [
              { path: 'forum', lazy: page(() => import('@/app/forum/page')) },
              { path: 'forum/post/new', lazy: page(() => import('@/app/forum/post/new/page')) },
              { path: 'forum/post/:id', lazy: page(() => import('@/app/forum/post/page')) },
              { path: 'forum/auth/login', lazy: page(() => import('@/app/forum/auth/login/page')) },
              { path: 'forum/auth/register', lazy: page(() => import('@/app/forum/auth/register/page')) },
              { path: 'forum/auth/forgot-password', lazy: page(() => import('@/app/forum/auth/forgot-password/page')) },
              { path: 'forum/auth/reset-password', lazy: page(() => import('@/app/forum/auth/reset-password/page')) },
              { path: 'forum/me', lazy: page(() => import('@/app/forum/me/page')) },
              { path: 'forum/u', lazy: page(() => import('@/app/forum/u/page')) },
              { path: 'forum/admin', lazy: page(() => import('@/app/forum/admin/page')) },
            ],
          },
          ...redirectRoutes,
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
