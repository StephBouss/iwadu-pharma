'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { syncCsrfFromCookie } from '@/lib/client/session';

export function LogoutButton() {
  const { logout, loggingOut } = useAuth();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="secondary"
      fullWidth
      loading={loggingOut}
      leadingIcon={<LogOut aria-hidden />}
      onClick={async () => {
        syncCsrfFromCookie();
        await logout();
        router.replace('/');
        router.refresh();
      }}
    >
      Se déconnecter
    </Button>
  );
}
