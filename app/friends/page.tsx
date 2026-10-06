import { Navigate } from 'react-router';

/** 友链已与赞助合并到 /links，这里只做客户端兜底跳转（边缘层见 public/_redirects） */
export default function FriendsPage() {
  return <Navigate to="/links" replace />;
}
