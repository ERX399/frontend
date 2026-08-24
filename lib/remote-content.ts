/**
 * 远程内容层 —— 从 PagesCMS 部署的静态域名获取博客文章。
 *
 * 流程：
 *   posts.json (文章索引清单) → 列表页
 *   /posts/<slug>.md          → 详情页（fetch → gray-matter 解析 → remark 编译 HTML）
 *
 * 环境变量：
 *   VITE_POSTS_DOMAIN  远程域名，例如 "https://raw-posts.2x.nz"
 *   （开发阶段可用 http://localhost:8788 或类似本地预览地址）
 */

// 默认值必须写死成生产域名：这个常量原本是 `|| ''`，配合下面 fetchPost 里的
// `if (!DOMAIN) return null` 短路，等于把「远程域名」做成了一个隐性的构建期依赖 ——
// 本机靠 .env.local 提供，而 .env* 全在 .gitignore 里。换一台机器（或 CI /
// Serverless 平台）clone 下来构建，列表页正常、**详情页会全部空白**，且没有任何报错。
// raw-posts.2x.nz 是 CF Pages 上的固定地址，直接作为默认值最省事。
const DOMAIN = import.meta.env.VITE_POSTS_DOMAIN || 'https://raw-posts.2x.nz';
const POSTS_JSON_URL = `${DOMAIN}/posts.json`;
const POST_MD_URL = (slug: string) => `${DOMAIN}/posts/${slug}.md`;

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  published: string;
  image: string | null;
  pinned: boolean;
  draft: boolean;
  hide: boolean;
  tags: string[];
  category?: string;
  lang?: string;
  ai_level?: number;
}

export interface Post extends PostMeta {
  html: string;
  content: string;
}

// 缓存 posts.json —— 生产环境由 Next.js 自动缓存 fetch 结果
let cachedIndex: PostMeta[] | null = null;

/**
 * 获取所有文章元数据列表（来自远程 posts.json）
 */
export async function fetchPostsIndex(): Promise<PostMeta[]> {
  if (cachedIndex) return cachedIndex;

  const res = await fetch(POSTS_JSON_URL);
  if (!res.ok) {
    console.error(`[remote-content] 获取 posts.json 失败: ${res.status}`);
    return [];
  }
  const json = await res.json();
  // 兼容旧「数组」与新「索引对象 { posts }」两种格式
  cachedIndex = (Array.isArray(json) ? json : json?.posts ?? []) as PostMeta[];
  return cachedIndex!;
}

/**
 * 根据 slug 获取单篇文章（fetch .md → frontmatter → HTML）
 */
export async function fetchPost(slug: string): Promise<Post | null> {
  if (!DOMAIN) return null;

  const url = POST_MD_URL(slug);
  const res = await fetch(url);
  if (!res.ok) return null;

  const raw = await res.text();
  return parseMarkdownPost(slug, raw);
}

async function parseMarkdownPost(slug: string, raw: string): Promise<Post> {
  const { default: matter } = await import('gray-matter');
  const parsed = matter(raw);
  const fm = parsed.data as Record<string, unknown>;
  const markdownBody = parsed.content;

  // 统一 frontmatter 字段名（pagescms 输出 coverImage，我们转成 image）
  const image = typeof fm.coverImage === 'string'
    ? fm.coverImage
    : typeof fm.image === 'string'
      ? fm.image
      : null;

  // 编译 markdown → HTML
  const html = await compileMarkdown(markdownBody);

  const tags: string[] = Array.isArray(fm.tags)
    ? fm.tags.filter((t): t is string => typeof t === 'string')
    : [];

  const post: Post = {
    slug,
    title: typeof fm.title === 'string' ? fm.title : slug,
    description: typeof fm.description === 'string' ? fm.description : '',
    published: typeof fm.date === 'string' ? fm.date : '',
    image,
    pinned: fm.pin === true || fm.pin === 'true',
    draft: fm.draft === true || fm.draft === 'true',
    hide: fm.hide === true || fm.hide === 'true',
    tags,
    category: typeof fm.category === 'string' ? fm.category : undefined,
    lang: typeof fm.lang === 'string' ? fm.lang : undefined,
    ai_level: typeof fm.ai_level === 'number' ? fm.ai_level : undefined,
    html,
    content: markdownBody,
  };

  return post;
}

// 缓存 unified 编译器实例避免重复创建
let compiler: ((md: string) => Promise<string>) | null = null;

async function compileMarkdown(md: string): Promise<string> {
  if (!compiler) {
    const { unified } = await import('unified');
    const remarkParse = (await import('remark-parse')).default;
    const remarkRehype = (await import('remark-rehype')).default;
    const rehypeStringify = (await import('rehype-stringify')).default;
    const remarkGfm = (await import('remark-gfm')).default;
    const rehypeSlug = (await import('rehype-slug')).default;
    const rehypeHighlight = (await import('rehype-highlight')).default;

    const engine = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeSlug)
      .use(rehypeHighlight)
      .use(rehypeStringify, { allowDangerousHtml: true });

    compiler = async (text: string) => {
      const result = await engine.process(text);
      return String(result);
    };
  }

  return compiler(md);
}

/** 获取所有可见文章列表（过滤 draft/hide） */
export async function getVisiblePosts(): Promise<PostMeta[]> {
  const all = await fetchPostsIndex();
  return all.filter((p) => !p.draft && !p.hide);
}

/** 获取所有 slug（用于 generateStaticParams） */
export async function getAllSlugs(): Promise<string[]> {
  const all = await fetchPostsIndex();
  return all.filter((p) => !p.draft && !p.hide).map((p) => p.slug);
}
