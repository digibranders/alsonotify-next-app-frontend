'use client';


import { WorkspaceDetailsPage } from '@/components/features/workspaces/ProjectCard';

export default async function WorkspaceDetailsPageRoute({ params }: { params: Promise<{ workspaceId: string }> }) {
  const resolvedParams = await params;

  return (

      <div className="flex-1 overflow-hidden">
        <WorkspaceDetailsPage id={resolvedParams.workspaceId} />
      </div>

  );
}
