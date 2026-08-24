import { useParams } from 'react-router';
import { PostDetailReader } from '@/components/post-detail-reader';

export default function PostDetailPage() {
  const { slug } = useParams();
  return <PostDetailReader slug={slug!} />;
}
