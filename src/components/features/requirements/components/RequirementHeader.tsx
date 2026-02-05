import { Breadcrumb, Skeleton } from 'antd';
import { FileText, ListTodo, BarChart2, Columns, TrendingUp, Paperclip } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TabButton } from './TabButton';

interface RequirementHeaderProps {
  workspace: any;
  requirement: any;
  requirementStatus: string;
  assignedTo: any[];
  router: any;
  activeTab: string;
  setActiveTab: (tab: 'details' | 'tasks' | 'gantt' | 'kanban' | 'pnl' | 'documents') => void;
  ctaConfig?: any;
  myWorkspacesData?: any;
  updateRequirement?: any;
}

export function RequirementHeader({
  workspace,
  requirement,
  requirementStatus,
  assignedTo,
  router, 
  activeTab,
  setActiveTab
}: Readonly<RequirementHeaderProps>) {
  return (
    <div className="px-6 pt-6 pb-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {workspace ? (
            <Breadcrumb
              separator={<span className="text-[20px] font-['Manrope:SemiBold',sans-serif] text-[#999999]">/</span>}
              items={[
                {
                  title: (
                    <span
                      onClick={() => router.push(`/dashboard/workspace/${workspace.id}/requirements`)}
                      className="cursor-pointer font-['Manrope:SemiBold',sans-serif] text-[20px] text-[#999999] hover:text-[#666666] transition-colors"
                    >
                      {workspace.name}
                    </span>
                  ),
                },
                {
                  title: (
                    <span className="font-['Manrope:SemiBold',sans-serif] text-[20px] text-[#111111] line-clamp-1 max-w-[300px]">
                      {requirement.title || requirement.name || 'Untitled Requirement'}
                    </span>
                  ),
                },
              ]}
            />
          ) : (
            <Skeleton.Input active size="small" style={{ width: 200 }} />
          )}
        </div>

        <div className="flex items-center gap-4">
          <StatusBadge status={requirementStatus} showLabel />
          {requirement.is_high_priority && (
            <span className="px-3 py-1.5 rounded-full text-[11px] font-['Manrope:SemiBold',sans-serif] uppercase tracking-wide bg-[#FFF5F5] text-[#ff3b3b]">
              HIGH PRIORITY
            </span>
          )}
          <div className="flex -space-x-2">
            {Array.isArray(assignedTo) && assignedTo.slice(0, 3).map((person: { name: string } | string, i: number) => {
              const name = typeof person === 'string' ? person : person?.name || 'U';
              return (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-[#ff3b3b] to-[#ff6b6b] flex items-center justify-center shadow-sm" title={name}>
                  <span className="text-[10px] text-white font-['Manrope:Bold',sans-serif]">
                    {name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#EEEEEE]">
        <div className="flex items-center gap-8">
          <TabButton
            active={activeTab === 'details'}
            onClick={() => setActiveTab('details')}
            icon={FileText}
            label="Details"
          />
          <TabButton
            active={activeTab === 'tasks'}
            onClick={() => setActiveTab('tasks')}
            icon={ListTodo}
            label="Tasks & Revisions"
          />
          <TabButton
            active={activeTab === 'gantt'}
            onClick={() => setActiveTab('gantt')}
            icon={BarChart2}
            label="Gantt Chart"
          />
          <TabButton
            active={activeTab === 'kanban'}
            onClick={() => setActiveTab('kanban')}
            icon={Columns}
            label="Kanban Board"
          />
          <TabButton
            active={activeTab === 'pnl'}
            onClick={() => setActiveTab('pnl')}
            icon={TrendingUp}
            label="P&L"
          />
          <TabButton
            active={activeTab === 'documents'}
            onClick={() => setActiveTab('documents')}
            icon={Paperclip}
            label="Documents"
          />
        </div>
      </div>
    </div>
  );
}