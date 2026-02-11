'use client';

import { Suspense } from 'react';

import { WorkspacePage } from '../../../components/features/workspaces/WorkspacePage';

export default function WorkspacesPageRoute() {
  // Removed employee redirect as per new requirements

  // Removed employee redirect as per new requirements


  return (

    <div className="flex-1 overflow-hidden">
      <Suspense fallback={<div>Loading workspaces...</div>}>
        <WorkspacePage />
      </Suspense>
    </div>

  );
}
