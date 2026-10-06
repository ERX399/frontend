import { Navigate } from 'react-router';

/** 赞助已与友链合并到 /links，这里只做客户端兜底跳转（边缘层见 public/_redirects） */
export default function SponsorsPage() {
  return <Navigate to="/links" replace />;
}
