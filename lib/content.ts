/**
 * 内容层入口。
 *
 * 当前为远程 fetch 模式，从 PagesCMS 部署的静态域名获取文章。
 * 环境变量 VITE_POSTS_DOMAIN 指定远程域名。
 *
 * 迁移说明：
 *   之前使用本地 content-collections 编译方式，现在改为运行时 fetch 远程
 *   原始 markdown。保留此入口是为了不修改 imports "@@/lib/content" 的页面。
 */

export type {
  PostMeta,
  Post,
} from './remote-content';

import {
  getVisiblePosts,
  getAllSlugs,
  fetchPost,
} from './remote-content';

export { getVisiblePosts, getAllSlugs, fetchPost };

/** 兼容旧接口：按 slug 获取单篇文章（返回 null 时请调用 notFound()） */
export async function getPostBySlug(slug: string): Promise<import('./remote-content').Post | null> {
  return fetchPost(slug);
}
