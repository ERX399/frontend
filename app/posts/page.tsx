import { Navigate, useSearchParams } from 'react-router';
import { PostsSearch } from '@/components/posts-search';
import { Icon } from '@/components/ui/icon';

export default function PostsPage() {
  const [params] = useSearchParams();
  const slug = params.get('slug');

  if (slug) {
    return <Navigate to={`/posts/${slug}`} replace />;
  }

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">博客</h1>
        <a
          href="/posts/rss.xml"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="订阅 RSS"
        >
          <Icon icon="mdi:rss" className="size-4" />
          RSS
        </a>
      </div>
      <PostsSearch />
    </main>
  );
}
