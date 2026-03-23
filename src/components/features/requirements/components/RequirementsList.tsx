'use client';

import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { RequirementCard } from './RequirementCard';
import { Skeleton } from '../../../ui/Skeleton';
import { Requirement, User, Employee } from '@/types/domain';
import { Archive } from 'lucide-react';

interface RequirementsListProps {
    isLoading: boolean;
    requirements: Requirement[];
    currentUser: User | Employee | null | undefined;
    userRole: string;
    activeStatusTab: string;
    currentPage: number;
    pageSize: number;
    handleReqAccept: (id: number) => void;
    handleReqReject: (id: number) => void;
    handleEditDraft: (req: Requirement) => void;
    handleDelete: (req: Requirement) => void;
    handleRestore: (req: Requirement) => void;
    handleDuplicateRequirement: (req: Requirement) => void;
    onNavigate: (workspaceId: number, reqId: number) => void;
    handleSubmitForReview?: (id: number) => void;
}

export function RequirementsList({
    isLoading,
    requirements,
    currentUser,
    userRole,
    activeStatusTab,
    currentPage: _currentPage,
    pageSize: _pageSize,
    handleReqAccept,
    handleReqReject,
    handleEditDraft,
    handleDelete,
    handleRestore,
    handleDuplicateRequirement,
    onNavigate,
    handleSubmitForReview,
}: RequirementsListProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white border border-[#EEEEEE] rounded-[24px] p-6 animate-pulse">
                        <div className="flex justify-between mb-4">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-4" />
                        </div>
                        <Skeleton className="h-6 w-3/4 mb-4" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-2/3 mb-6" />
                        <div className="h-2 w-full bg-[#F0F0F0] rounded-full mb-6" />
                        <div className="flex justify-between">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-8 w-24 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (requirements.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-[#999999] font-medium">
                    No requirements found
                </p>
            </div>
        );
    }

    const paginatedRequirements = requirements;

    return (
        <div className="pb-6">
            <ResponsiveMasonry
                columnsCountBreakPoints={{ 350: 1, 750: 2, 1200: 3 }}
            >
                <Masonry gutter="16px">
                    {paginatedRequirements.map((requirement) => (
                        <RequirementCard
                            key={requirement.id}
                            requirement={requirement}
                            currentUserId={currentUser?.id}
                            onAccept={userRole !== 'Employee' ? () => handleReqAccept(requirement.id) : undefined}
                            onReject={userRole !== 'Employee' ? () => handleReqReject(requirement.id) : undefined}
                            onEdit={
                                userRole !== 'Employee'
                                    && !['Completed', 'Review', 'Submitted'].includes(requirement.rawStatus || '')
                                    ? () => handleEditDraft(requirement)
                                    : undefined
                            }

                            // Condition for Delete vs Restore — block during active cross-party workflow states
                            onDelete={
                                userRole !== 'Employee' && activeStatusTab !== 'archived'
                                    && !['Review', 'Submitted', 'Revision'].includes(requirement.rawStatus || '')
                                    ? () => handleDelete(requirement)
                                    : undefined
                            }
                            onRestore={
                                userRole !== 'Employee' && activeStatusTab === 'archived'
                                    ? () => handleRestore(requirement)
                                    : undefined
                            }

                            deleteLabel={(activeStatusTab === 'active' || activeStatusTab === 'completed' || activeStatusTab === 'delayed') ? 'Archive' : 'Delete'}
                            deleteIcon={(activeStatusTab === 'active' || activeStatusTab === 'completed' || activeStatusTab === 'delayed') ? <Archive className="w-3.5 h-3.5" /> : undefined}
                            onDuplicate={
                                userRole !== 'Employee' && activeStatusTab !== 'archived'
                                    ? () => handleDuplicateRequirement(requirement)
                                    : undefined
                            }
                            onNavigate={() => onNavigate(requirement.workspace_id || 0, requirement.id)}
                            onSubmitForReview={
                                userRole !== 'Employee' && handleSubmitForReview
                                    && (requirement.type === 'inhouse' || requirement.isReceiver === true)
                                    ? () => handleSubmitForReview(requirement.id)
                                    : undefined
                            }
                        />
                    ))}
                </Masonry>
            </ResponsiveMasonry>
        </div>
    );
}
