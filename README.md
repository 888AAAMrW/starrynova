# Starry Nova · 深空观测站

三站一体的个人主站仓库,由 `src/proxy.ts` 按子域名分发:

| 子域名 | 板块 | 路由 |
|--------|------|------|
| starrynova.cc | 星际导航(着陆页) | `src/app/(home)/nav/` |
| hot.starrynova.cc | 星闻 · THE DAILY FLOW(七平台热搜聚合,报纸风三栏) | `src/app/(hot)/` |
| blog.starrynova.cc | 深空博客(MDX + KV 在线文章) | `src/app/blog/` |

后端 API 在 `src/app/api/`(共 9 个路由:articles / editor-note / editor-overview / geo / guestbook / hot / now / projects / search),均有活跃调用方。

## 技术栈

Next.js 16 · React 19 · Tailwind CSS 4 · SWR · Velite(MDX) · Vercel KV · Shiki

## 本地运行

```bash
npm install
npm run dev   # velite && next dev
```

## 部署

本目录执行 `npx vercel --prod`(项目名 hot-trending,域名解析在阿里云,新子域需阿里云加 CNAME + Vercel 绑域名两步)。
