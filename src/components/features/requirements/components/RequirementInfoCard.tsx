import { FileText, Briefcase } from 'lucide-react';
import { formatDateForDisplay } from '@/utils/date';
import { sanitizeRichText } from '@/utils/sanitizeHtml';
import { Requirement, Workspace, Task } from '@/types/domain';

interface RequirementInfoCardProps {
  requirement: Requirement;
  workspace: Workspace | null | undefined;
  tasks: Task[];
  timezone?: string;
}

export function RequirementInfoCard({ requirement, tasks, timezone }: Omit<RequirementInfoCardProps, 'workspace'>) {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Description Section */}
      <div className="bg-white rounded-[16px] p-8 border border-[#EEEEEE] shadow-sm">
        <h3 className="text-[16px] font-['Manrope:Bold',sans-serif] text-[#111111] mb-4 flex items-center gap-2">
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
                  <h4 className="text-[14px] font-['Manrope:Bold',sans-serif] text-[#111111] mb-2">Overview</h4>
                  <p className="text-[14px] text-[#444444] font-['Inter:Regular',sans-serif] leading-relaxed">
                    {overview}
                  </p>
                </div>
              )}

              {/* Key Deliverables */}
              {deliverables.length > 0 && (
                <div>
                  <h4 className="text-[14px] font-['Manrope:Bold',sans-serif] text-[#111111] mb-2">Key Deliverables</h4>
                  <ul className="space-y-2">
                    {deliverables.map((item: string, idx: number) => {
                      const cleanItem = item.replace(/^[•\-*]\s*/, '').trim();
                      return (
                        <li key={idx} className="text-[14px] text-[#444444] font-['Inter:Regular',sans-serif] leading-relaxed flex items-start">
                          <span className="text-[#ff3b3b] mr-2">•</span>
                          <span>{cleanItem}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Technical Requirements */}
              {technical.length > 0 && (
                <div>
                  <h4 className="text-[14px] font-['Manrope:Bold',sans-serif] text-[#111111] mb-2">Technical Requirements</h4>
                  <ul className="space-y-2">
                    {technical.map((item: string, idx: number) => {
                      const cleanItem = item.replace(/^[•\-*]\s*/, '').trim();
                      return (
                        <li key={idx} className="text-[14px] text-[#444444] font-['Inter:Regular',sans-serif] leading-relaxed flex items-start">
                          <span className="text-[#ff3b3b] mr-2">•</span>
                          <span>{cleanItem}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Fallback: if no structured format, show as-is but render as sanitized HTML */}
              {!overview && deliverables.length === 0 && technical.length === 0 && (
                <div
                  className="text-[14px] text-[#444444] font-['Inter:Regular',sans-serif] leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichText(requirement.description || '') }}
                />
              )}
            </div>
          );
        })()}
      </div>

      {/* Requirement Details Section */}
      <div className="bg-white rounded-[16px] p-8 border border-[#EEEEEE] shadow-sm">
        <h3 className="text-[16px] font-['Manrope:Bold',sans-serif] text-[#111111] mb-6 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-[#ff3b3b]" />
          Requirement Details
        </h3>

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Type */}
          <div>
            <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wider mb-2">Type</p>
            <p className="text-[14px] font-['Inter:Medium',sans-serif] text-[#111111] uppercase">
              {requirement.type === 'outsourced'
                ? (requirement.isReceiver ? 'Client work' : 'Outsourced')
                : (['client', 'Client work', 'Client Work'].includes(requirement.type) ? 'Client work' : 'Inhouse')}
            </p>
          </div>

          {/* Partner / Company */}
          <div>
            <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wider mb-2">Partner / Company</p>
            <p className="text-[14px] font-['Inter:Medium',sans-serif] text-[#111111]">
              {requirement.sender_company?.name || 'In-house'}
            </p>
          </div>

          {/* Start Date */}
          <div>
            <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wider mb-2">Start Date</p>
            <p className="text-[14px] font-['Inter:Medium',sans-serif] text-[#111111]">
              {requirement.start_date ? formatDateForDisplay(requirement.start_date, timezone) : 'Not set'}
            </p>
          </div>

          {/* End Date */}
          <div>
            <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wider mb-2">Due Date</p>
            <p className="text-[14px] font-['Inter:Medium',sans-serif] text-[#111111]">
              {requirement.end_date ? formatDateForDisplay(requirement.end_date, timezone) : 'Not set'}
            </p>
          </div>

          {/* Contact Person */}
          <div>
            <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wider mb-2">Contact Person</p>
            <p className="text-[14px] font-['Inter:Medium',sans-serif] text-[#111111]">
              {requirement.contact_person?.name || 'Unknown'}
            </p>
          </div>

          {/* Quoted Price */}
          <div>
            <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wider mb-2">Quoted Price</p>
            <p className="text-[14px] font-['Inter:Medium',sans-serif] text-[#111111]">
              ${requirement.quoted_price ? Number(requirement.quoted_price).toFixed(2) : '0.00'}
            </p>
          </div>

          {/* Total Tasks */}
          <div>
            <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wider mb-2">Total Tasks</p>
            <p className="text-[14px] font-['Inter:Medium',sans-serif] text-[#111111]">
              {requirement.total_task || tasks.length || 0}
            </p>
          </div>

          {/* Leader */}
          {requirement.leader_user && (
            <div>
              <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wider mb-2">Leader</p>
              <p className="text-[14px] font-['Inter:Medium',sans-serif] text-[#111111]">
                {requirement.leader_user.name || 'N/A'}
              </p>
            </div>
          )}

          {/* Manager */}
          {requirement.manager_user && (
            <div>
              <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wider mb-2">Manager</p>
              <p className="text-[14px] font-['Inter:Medium',sans-serif] text-[#111111]">
                {requirement.manager_user.name || 'N/A'}
              </p>
            </div>
          )}

          {/* Document Link */}
          {requirement.document_link && (
            <div>
              <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wider mb-2">Document</p>
              <a
                href={requirement.document_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] font-['Inter:Medium',sans-serif] text-[#2F80ED] hover:underline truncate block"
              >
                View Document
              </a>
            </div>
          )}

          {/* Priority */}
          {requirement.is_high_priority && (
            <div>
              <p className="text-[11px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wider mb-2">Priority</p>
              <span className="px-2 py-1 bg-[#FFF5F5] text-[#ff3b3b] text-[12px] font-['Manrope:Bold',sans-serif] rounded-full">
                High Priority
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
