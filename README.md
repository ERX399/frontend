# 夏之博客主站前端

夏之博客（520pro.top）的 React 前端，Vite + React Router 7 + Tailwind CSS 4。

## 技术栈

- React 19 / React Router 7
- Vite 8 + Tailwind CSS 4
- markdown-it + highlight.js（文章渲染）
- qrcode（赞助/加群二维码本地生成）

## 数据源

- 文章数据：`raw-posts.520pro.top`（由 [blog-data](../../ERX399/blog-data) 仓库构建生成）
- 友链/赞助：`raw-f.520pro.top`

## 开发

```bash
npm install
npm run dev        # http://127.0.0.1:5174
npm run build      # 产物输出到 dist/
```

## 部署

Cloudflare，本地 `wrangler deploy`。

## 许可证

[MIT](LICENSE)