# 音乐解析测试页规格

日期：2026-10-06
主题：纯静态音乐解析工具页（网易云 + 酷狗，在线解析 + 本地上传降级）
状态：待夏老板审阅

## 1. 目标与范围

在博客前端（Vite + React 19 + React Router 8 纯静态 SPA）里加一个**独立工具页**，
支持从网易云音乐和酷狗音乐解析歌曲：粘贴分享链接、按关键词搜索、在线试听、显示
歌词与封面，并提供下载入口；在线接口不可用时降级为**本地音频文件上传解析**。

约束（夏老板明确）：

- **纯静态前端**，不新增任何后端 / Worker / 反代，只调用公开第三方接口
- **不干扰博客**：不加导航项、不上首页、不加 /tools 卡片，只注册隐藏路由
- 两个平台都做，接口不稳定时如实提示，不假装可用
- 下载功能要做，"能下就下"

## 2. 实测结论（本规格的事实基础）

2026-10-06 实测 `https://api.i-meto.com/meting/api`（Meting 协议）：

| 能力 | 端点 | 实测结果 | 可用性 |
| --- | --- | --- | --- |
| 网易云搜索 | `server=netease&type=search&id=<关键词>` | 200，返回数组 | 可用 |
| 网易云单曲 | `server=netease&type=song&id=<歌曲ID>` | 200 | 可用 |
| 网易云歌单 | `server=netease&type=playlist&id=<歌单ID>` | 200 | 可用 |
| 网易云歌词 | `server=netease&type=lrc&id=<ID>&auth=<签名>` | 200，LRC 文本 | 可用 |
| 网易云封面 | `server=netease&type=pic&id=<ID>&auth=<签名>` | 200 | 可用 |
| 网易云直链 | `server=netease&type=url&id=<ID>&auth=<签名>` | **302** 跳转到 `*.music.126.net/*.mp3` | 可用 |
| 酷狗搜索 | `server=kugou&type=search` | 200，但 `auth` 为固定值 | 半废 |
| 酷狗直链 | `server=kugou&type=url` | **404** | 不可用 |
| 酷狗封面 | `server=kugou&type=pic` | **500** | 不可用 |
| 酷狗单曲 | `server=kugou&type=song` | 返回 `id=undefined` | 不可用 |
| 腾讯 / 百度 / 酷我 / 咪咕 | 各 `server=` 值 | 空数组 / `id=undefined` / 参数不合法 | 不可用 |

关键机制：

1. **`auth` 是短时效签名**。必须用搜索返回的完整 `url` 字段（含 `auth`）发起请求，
   自行拼接 `type=url&id=...` 会得到 `401 鉴权失败,非法调用`。签名会过期，之前的
   签名隔一段时间后复用返回 404。
2. 直链请求返回 **302**，`Location` 指向真实音频 CDN。浏览器 `<audio src="Meting直链">`
   会跟随跳转，可正常播放。
3. **真实 CDN（`*.music.126.net`）不返回 `access-control-allow-origin`**，因此
   `fetch` 读取音频字节会被 CORS 拦截；`<audio>` 播放与 `<a download>` 不受影响
   （能否真正下载取决于 CDN 的 `Content-Disposition` 与浏览器行为）。
4. Meting 公共实例的 `api.i-meto.com` 会返回 `access-control-allow-origin: *`，
   浏览器可跨域调用。其他曾被广泛使用的公共实例（`api.injahow.cn`、`meting.norfr.cn`、
   `api.9o.pub` 等）实测均已失效。

上游背景：酷狗官方接口在 2026-02 前后改变了字段结构并加强风控，即使配置会员 Cookie
也无法取到播放地址（见 metowolf/Meting issue「Kugou API 返回值变化+会员ck具体要求」）。

## 3. 技术栈（不变）

- Vite 8 + React 19 + TypeScript + Tailwind CSS 4
- React Router 8（`route.lazy` 路由级懒加载）
- 图标：`@iconify/react`（lucide 图标集）
- 无新增运行时依赖；本地上传解析用浏览器原生 `FileReader` / `Audio` / `Blob`
- 新增开发依赖：`vitest`（`lib/music/` 下纯函数的单元测试）

## 4. 架构

```
app/music/page.tsx                    路由页，仅渲染 MusicClient
components/music/music-client.tsx     主体 UI：引擎切换 / 搜索 / 链接输入 / 结果列表
components/music/song-list.tsx        结果列表项
components/music/player-bar.tsx       <audio> 播放条 + 进度 + 音量
components/music/lyric-panel.tsx      LRC 歌词解析与高亮
components/music/upload-fallback.tsx  本地上传降级：选文件 → 解析 → 播放
lib/music/types.ts                    Track / LyricLine / ProviderResult 等类型
lib/music/providers.ts                端点配置表（候选实例数组）
lib/music/netease.ts                  网易云引擎：search / song / playlist / lrc / pic / url
lib/music/kugou.ts                    酷狗引擎：同样接口形状
lib/music/link.ts                     分享链接解析：从文本里抠出平台 + ID
lib/music/id3.ts                      本地文件 ID3v2 / ID3v1 标签解析
lib/music/index.ts                    统一门面：search / resolve / parseLink
```

### 各单元职责

- **`providers.ts`**：只存数据。形如
  `[{ name: 'netease', label: '网易云', base: 'https://api.i-meto.com/meting/api' }, ...]`，
  以及每个平台的候选顺序。加实例只需往数组里加一行。
- **`netease.ts` / `kugou.ts`**：各自实现 `search(keyword)`、`detail(id)`、
  `resolve(id, auth)`。对外只暴露纯函数，不感知 UI。内部按 `providers.ts` 的顺序
  逐个尝试，全部失败则抛出带平台信息的错误。
- **`link.ts`**：输入一段任意文本，输出 `{ platform, id, kind } | null`。
  网易云识别 `/song?id=`、`/playlist?id=`、`music.163.com/#/song?id=`；
  酷狗识别 `#hash=`、`/song.html?id=`。无效返回 `null`，不抛异常。
- **`id3.ts`**：读 ID3v2（标题/歌手/专辑/封面/时长）与 ID3v1 兜底，纯前端解析。
- **`index.ts`**：把上面几块合成 3 个动作——`search(platform, keyword)`、
  `resolve(platform, id)`、`parseLink(text)`，是组件唯一需要 import 的入口。

### 数据流

1. 用户在输入框粘贴分享文本 → `parseLink()` 抠出平台与 ID → `resolve()` 取直链与歌词 → 播放
2. 用户输入关键词 → `search()` 拿搜索结果数组 → 点某项 → `resolve()` → 播放
3. 在线引擎全部失败 → 自动切到上传模式 → 用户选本地文件 → `id3.ts` 解析 → 本地播放

## 5. 界面

单页三段式，沿用站内现有视觉语言（方角、`border-border`、`bg-card`、`text-muted-foreground`、
hover 用 `hover:bg-foreground/15`，不用圆角）：

1. **顶部**：平台切换（网易云 / 酷狗）、搜索框、当前源状态徽章
2. **中部**：结果列表（封面缩略图 + 标题 + 歌手 + 播放/下载按钮），或链接解析结果卡
3. **底部固定播放条**：播放/暂停、进度条、时间、音量、歌词开关

歌词面板可选展开，按当前播放时间高亮对应行。

**空态与错误**：接口失效时在结果区显示明确文案（"酷狗接口维护中，可改用本地上传"），
不显示假数据。

## 6. 错误处理

- 网络错误 / 非 2xx：捕获后按候选实例继续尝试，全部失败给出平台级错误
- `auth` 过期（401 / 404）：自动重新走一次 `search` 拿到新鲜 `auth` 再请求一次
- 酷狗全实例失败：界面降级提示 + 一键跳到上传模式
- 下载：`<a download>` 直链，但真实 CDN 是**跨域**的，浏览器会忽略 `download`
  属性转而直接打开该资源（这是浏览器安全策略，不是 bug）。因此界面上同时提供
  「新标签打开直链」按钮，并在旁边注明"可用右键另存为下载"
- 上传：文件不是音频 / 无 ID3 标签 → 用文件名兜底，仍可播放

## 7. 测试

纯逻辑部分（`link.ts`、`id3.ts`、`netease.ts` 的 URL 拼装）写单元测试：

- `parseLink`：各平台各形态链接、含噪声的分享文案、无效文本
- `id3`：带 ID3v2.3 / ID3v2.4 / 仅 ID3v1 / 无标签的样音文件
- URL 拼装：`auth` 是否原样保留、参数顺序稳定

UI 与网络部分靠手动验收：本地 `npm run dev` 开 `/music`，逐项走查上面三条数据流。

## 8. 明确不做

- 不新增后端、Worker、反代、爬虫
- 不改动任何博客页面、导航、首页、`/tools` 列表
- 不做登录、不做歌单收藏、不做批量下载
- 不保证酷狗可用（上游接口已废，仅保留代码路径与多实例容错）
