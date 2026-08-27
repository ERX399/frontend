'use client';

import { ForumAuthProvider } from '@/lib/forum/stores/auth';

export function ForumProvider({ children }: { children: React.ReactNode }) {
  return <ForumAuthProvider>{children}</ForumAuthProvider>;
}
