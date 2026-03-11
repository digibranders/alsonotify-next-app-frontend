import { FileText, Briefcase, Star, RotateCcw, Clock } from 'lucide-react';
import { Rate } from 'antd';
import { formatDateForDisplay } from '@/utils/date';
import { sanitizeUrl } from '@/utils/sanitizeUrl';
import { Linkify } from '@/components/common/Linkify';
import { Requirement, Workspace, Task } from '@/types/domain';

interface RequirementInfoCardProps {
  requirement: Requirement;
  workspace: Workspace | null | undefined;
  tasks: Task[];
  timezone?: string;
}

export function RequirementInfoCard({ requirement, tasks, timezone }: RequirementInfoCardProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Requirement Details Section */}
      <div className="bg-white rounded-[16px] p-8 border border-[#EEEEEE] shadow-sm">
        <h3 className="text-base font-bold text-[#111111] mb-6 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-[#ff3b3b]" />
          Requirement Details
        </h3>

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Type */}
          <div>
            <p className="text-xxs font-bold text-[#999999] uppercase tracking-wider mb-2">Type</p>
            <p className="text-sm font-medium text-[#111111] uppercase">
              {requirement.type === 'outsourced'
                ? (requirement.isReceiver ? 'Client work' : 'Outsourced')
                : (['client', 'Client work', 'Client Work'].includes(requirement.type || '') ? 'Client work' : 'Inhouse')}
            </p>
          </div>

          {/* Partner / Company */}
          <div>
            <p className="text-xxs font-bold text-[#999999] uppercase tracking-wider mb-2">Partner / Company</p>
            <p className="text-sm font-medium text-[#111111]">
              {requirement.sender_company?.name || 'In-house'}
            </p>
          </div>

          {/* Start Date */}
          <div>
            <p className="text-xxs font-bold text-[#999999] uppercase tracking-wider mb-2">Start Date</p>
            <p className="text-sm font-medium text-[#111111]">
              {requirement.start_date ? formatDateForDisplay(requirement.start_date, timezone) : 'Not set'}
            </p>
          </div>

          {/* End Date */}
          <div>
            <p className="text-xxs font-bold text-[#999999] uppercase tracking-wider mb-2">Due Date</p>
            <p className="text-sm font-medium text-[#111111]">
              {requirement.end_date ? formatDateForDisplay(requirement.end_date, timezone) : 'Not set'}
            </p>
          </div>

          {/* Contact Person */}
          <div>
            <p className="text-xxs font-bold text-[#999999] uppercase tracking-wider mb-2">Contact Person</p>
            <p className="text-sm font-medium text-[#111111]">
              {(typeof requirement.contact_person === 'string'
                ? requirement.contact_person
                : requirement.contact_person?.name) || 'Unknown'}
            </p>
          </div>

          {/* Quoted Price - Hide for in-house */}
          {requirement.type !== 'inhouse' && !['inhouse', 'Inhouse'].includes(requirement.type || '') && (
            <div>
              <p className="text-xxs font-bold text-[#999999] uppercase tracking-wider mb-2">Quoted Price</p>
              <p className="text-sm font-medium text-[#111111]">
                ${requirement.quoted_price ? Number(requirement.quoted_price).toFixed(2) : '0.00'}
              </p>
            </div>
          )}

          {/* Total Tasks */}
          <div>
            <p className="text-xxs font-bold text-[#999999] uppercase tracking-wider mb-2">Total Tasks</p>
            <p className="text-sm font-medium text-[#111111]">
              {requirement.total_task || tasks.length || 0}
            </p>
          </div>

          {/* Leader */}
          {requirement.leader_user && (
            <div>
              <p className="text-xxs font-bold text-[#999999] uppercase tracking-wider mb-2">Leader</p>
              <p className="text-sm font-medium text-[#111111]">
                {requirement.leader_user.name || 'N/A'}
              </p>
            </div>
          )}

          {/* Manager */}
          {requirement.manager_user && (
            <div>
              <p className="text-xxs font-bold text-[#999999] uppercase tracking-wider mb-2">Manager</p>
              <p className="text-sm font-medium text-[#111111]">
                {requirement.manager_user.name || 'N/A'}
              </p>
            </div>
          )}

          {/* Document Link */}
          {sanitizeUrl(requirement.document_link) && (
            <div>
              <p className="text-xxs font-bold text-[#999999] uppercase tracking-wider mb-2">Document</p>
              <a
                href={sanitizeUrl(requirement.document_link)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#2F80ED] hover:underline truncate block"
              >
                View Document
              </a>
            </div>
          )}

          {/* Priority */}
          {requirement.is_high_priority && (
            <div>
              <p className="text-xxs font-bold text-[#999999] uppercase tracking-wider mb-2">Priority</p>
              <span className="px-2 py-1 bg-[#FFF5F5] text-[#ff3b3b] text-xs font-bold rounded-full">
                High Priority
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Description Section */}
      <div className="bg-white rounded-[16px] p-8 border border-[#EEEEEE] shadow-sm">
        <h3 className="text-base font-bold text-[#111111] mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#ff3b3b]" />
          Description
        </h3>

        {/* Parse description to extract sections */}
        {(() => {
          const desc = requirement.description || '';
          // Create a clean version without HTML tags for parsing logic
          const cleanDesc = desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

          const overviewMatch = cleanDesc.match(/Overview:\s*(.+?)(?=\s*Key Deliverables:|$)/i);
          const deliverablesMatch = cleanDesc.match(/Key Deliverables:\s*([\s\S]+?)(?=\s*Technical Requirements:|$)/i);
          const technicalMatch = cleanDesc.match(/Technical Requirements:\s*([\s\S]+?)$/i);

          const overview = overviewMatch ? overviewMatch[1].trim() : '';
          const listPattern = /•|\s-\s|\s-|-\s|\d+\./;
          const deliverables = deliverablesMatch
            ? deliverablesMatch[1].split(listPattern).filter((line: string) => line.trim())
            : [];
          const technical = technicalMatch
            ? technicalMatch[1].split(listPattern).filter((line: string) => line.trim())
            : [];

          return (
            <div className="space-y-6">
              {/* Overview */}
              {overview && (
                <div>
                  <h4 className="text-sm font-bold text-[#111111] mb-2">Overview</h4>
                  <Linkify className="text-[#444444]">
                    {overview}
                  </Linkify>
                </div>
              )}
              
              {/* Key Deliverables */}
              {deliverables.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-[#111111] mb-2">Key Deliverables</h4>
                  <ul className="space-y-2">
                    {deliverables.map((item: string, idx: number) => {
                      const cleanItem = item.replace(/^[•\-*]\s*/, '').trim();
                      return (
                        <li key={idx} className="text-[#444444] flex items-start">
                          <span className="text-[#ff3b3b] mr-2 shrink-0 mt-0.5">•</span>
                          <Linkify className="flex-1">
                            {cleanItem}
                          </Linkify>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Technical Requirements */}
              {technical.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-[#111111] mb-2">Technical Requirements</h4>
                  <ul className="space-y-2">
                    {technical.map((item: string, idx: number) => {
                      const cleanItem = item.replace(/^[•\-*]\s*/, '').trim();
                      return (
                        <li key={idx} className="text-[#444444] flex items-start">
                          <span className="text-[#ff3b3b] mr-2 shrink-0 mt-0.5">•</span>
                          <Linkify className="flex-1">
                            {cleanItem}
                          </Linkify>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Fallback: if no structured format, show as markdown (handles auto-links) */}
              {!overview && deliverables.length === 0 && technical.length === 0 && (
                <Linkify className="text-[#444444] whitespace-pre-wrap">
                  {requirement.description || ''}
                </Linkify>
              )}
            </div>
          );
        })()}
      </div>

      {/* Submission Info — shown when in Review status */}
      {requirement.status === 'Review' && requirement.submission_remark && (
        <div className="bg-white rounded-[16px] p-6 border border-[#EEEEEE] shadow-sm">
          <h3 className="text-sm font-bold text-[#111111] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#ff3b3b]" />
            Submission Note
          </h3>
          <Linkify className="text-[#444444]">
            {requirement.submission_remark}
          </Linkify>
        </div>
      )}

      {/* Revision Info — shown when in Revision status */}
      {requirement.status === 'Revision' && (
        <div className="bg-white rounded-[16px] p-6 border border-[#EEEEEE] shadow-sm">
          <h3 className="text-sm font-bold text-[#111111] mb-3 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#ff3b3b]" />
            Revision Requested
            {(requirement.revision_round ?? 0) > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-[#FFF5F5] text-[#ff3b3b] text-xxs font-bold rounded-full">
                Round {requirement.revision_round}
              </span>
            )}
          </h3>
          {requirement.revision_remark && (
            <Linkify className="text-[#444444]">
              {requirement.revision_remark}
            </Linkify>
          )}
        </div>
      )}

      {/* Approval Info — shown when Completed */}
      {requirement.status === 'Completed' && (requirement.approval_rating != null || requirement.approval_remark) && (
        <div className="bg-white rounded-[16px] p-6 border border-[#EEEEEE] shadow-sm">
          <h3 className="text-sm font-bold text-[#111111] mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-[#ff3b3b]" />
            Approval Feedback
          </h3>
          {requirement.approval_rating != null && (
            <div className="mb-2">
              <Rate disabled value={requirement.approval_rating} className="text-[#ff3b3b] text-lg" />
            </div>
          )}
          {requirement.approval_remark && (
            <Linkify className="text-[#444444]">
              {requirement.approval_remark}
            </Linkify>
          )}
        </div>
      )}
    </div>
  );
}
