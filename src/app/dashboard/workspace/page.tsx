'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getRoleFromUser } from '@/utils/roleUtils';

import { WorkspacePage } from '../../../components/features/workspaces/WorkspacePage';

export default function WorkspacesPageRoute() {
  const { user } = useAuth();
  const router = useRouter();
  const role = getRoleFromUser(user);

  useEffect(() => {
    if (role === 'Employee') {
      router.push('/dashboard/requirements');
    }
  }, [role, router]);

  if (role === 'Employee') {
    return null;
  }

  return (

      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<div>Loading workspaces...</div>}>
          <WorkspacePage />
        </Suspense>
      </div>

  );
}
