import { Navigate, useSearchParams } from 'react-router';
import { PostsSearch } from '@/components/posts-search';

export default function PostsPage() {
  const [params] = useSearchParams();
  const slug = params.get('slug');

  if (slug) {
    return <Navigate to={`/posts/${slug}`} replace />;
  }

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <PostsSearch />
    </main>
  );
}
