'use client';

/**
 * GitHub 登录回跳的令牌接收器。
 *
 * Auth Worker 的 OAuth 回调把令牌放在 **URL fragment** 里跳回来
 * （`https://2x.nz/#token=…&new=0`）—— 用 fragment 而不是 query，是为了让它
 * 不进 Referer、不进各级访问日志。代价是服务端看不见它，**必须由前端接**。
 *
 * 挂在 root 而不是登录页：回跳落点是用户点「用 GitHub 登录」时所在的页面，
 * 不一定经过 /auth。
 *
 * 接完立刻用 replaceState 把 fragment 抹掉：留在地址栏里，用户复制链接分享出去
 * 就等于把一张 7 天有效的账号令牌一起发出去了。
 */
import { useEffect } from 'react';
import { setToken } from '@/lib/account/api';

export function OAuthTokenCatcher() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    const params = new URLSearchParams(hash.slice(1));
    const token = params.get('token');
    const err = params.get('github_error');

    if (!token && !err) return;

    if (token) setToken(token);

    // 抹掉 fragment。用 replaceState 而不是改 location.hash —— 后者会新增一条
    // 历史记录，用户按返回键又回到带令牌的地址。
    params.delete('token');
    params.delete('new');
    params.delete('github_error');
    const rest = params.toString();
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search + (rest ? '#' + rest : ''),
    );

    if (token) {
      // 整页重载而不是走客户端路由：登录态是在模块顶层读的（各处的 getToken），
      // 光换 state 救不回那些已经用「未登录」渲染过的组件。
      window.location.reload();
    } else if (err) {
      // 失败时把人送回登录页并带上原因，别把用户扔在一个看不出发生了什么的页面上
      window.location.href = '/auth?github_error=' + encodeURIComponent(err);
    }
  }, []);

  return null;
}
