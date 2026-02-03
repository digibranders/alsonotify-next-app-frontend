import { Plus, Edit, Trash2, Lock } from 'lucide-react';
import { Input } from "antd";
import { CompanyLeaveSetting } from '@/types/auth';
import { Holiday } from '@/types/domain';

interface LeavesTabProps {
  leaves: CompanyLeaveSetting[];
  handleUpdateLeaveCount: (id: string, count: string) => void;
  canEditLeaves: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  isSaving: boolean;
  isLoadingHolidays: boolean;
  publicHolidays: Holiday[];
  handleAddHoliday: () => void;
  handleEditHoliday: (holiday: Holiday) => void;
  handleDeleteHoliday: (id: number | string) => void;
}

export function LeavesTab({
  leaves,
  handleUpdateLeaveCount,
  canEditLeaves,
  isEditing,
  onEdit,
  onSave,
  isSaving,
  isLoadingHolidays,
  publicHolidays,
  handleAddHoliday,
  handleEditHoliday,
  handleDeleteHoliday,
}: LeavesTabProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 grid grid-cols-2 gap-12">
      {/* Leaves Column */}
      <div className="space-y-6 sticky top-0 self-start">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">Leaves</h2>
        </div>

        {leaves.map((leave) => (
          <div key={leave.id} className="space-y-2">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">{leave.name}</span>
            <div className="flex items-center gap-3">
              <Input
                value={leave.count}
                onChange={(e) => handleUpdateLeaveCount(String(leave.id), e.target.value)}
                disabled={!canEditLeaves || !isEditing}
                className={`h-11 rounded-lg border-[#EEEEEE] focus:border-[#ff3b3b] font-['Manrope:Medium',sans-serif] text-[13px] ${!isEditing ? 'bg-[#F7F7F7] cursor-not-allowed' : 'bg-white'}`}
              />
              {canEditLeaves && !isEditing && (
                <button
                  onClick={onEdit}
                  className="p-2 text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] rounded-full transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="pt-6 space-y-6">
          <div className="space-y-2">
            <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#666666]">Total Leaves</span>
            <div className="h-11 px-3 flex items-center rounded-lg border border-[#EEEEEE] bg-[#F7F7F7] text-[#666666] font-['Manrope:Medium',sans-serif] text-[13px]">
              {leaves.reduce((acc, curr) => acc + curr.count, 0)} days
            </div>
          </div>

          {canEditLeaves && isEditing && (
            <div className="flex justify-end">
              <button
                onClick={onSave}
                disabled={isSaving}
                className="bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 disabled:opacity-50 text-white font-['Manrope:SemiBold',sans-serif] px-8 h-10 rounded-full shadow-lg shadow-[#ff3b3b]/20 text-[13px] transition-all active:scale-95"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Public Holidays Column */}
      <div className="space-y-6 border-l border-[#EEEEEE] pl-12">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">Public Holidays</h2>
          {canEditLeaves && (
            <button
              onClick={handleAddHoliday}
              className="hover:scale-110 active:scale-95 transition-transform"
            >
              <Plus className="w-5 h-5 text-[#ff3b3b]" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          {isLoadingHolidays ? (
            <div className="text-center py-4 text-[13px] text-[#999999]">Loading holidays...</div>
          ) : publicHolidays.length > 0 ? (
            publicHolidays.map((holiday) => (
              <div key={holiday.id} className="p-4 border border-[#EEEEEE] rounded-[12px] flex items-center justify-between bg-white hover:shadow-sm transition-shadow">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-['Manrope:Bold',sans-serif] text-[#111111]">{holiday.name}</p>
                    {holiday.is_api && (
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-['Manrope:Bold',sans-serif]">
                        Public
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#666666] font-['Manrope:Medium',sans-serif]">{new Date(holiday.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!holiday.is_api && (
                    <>
                      {canEditLeaves && (
                        <button
                          onClick={() => handleEditHoliday(holiday)}
                          className="p-2 text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] rounded-full transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canEditLeaves && (
                        <button
                          onClick={() => handleDeleteHoliday(holiday.id)}
                          className="p-2 text-[#ff3b3b] hover:bg-[#FFF5F5] rounded-full transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                  {holiday.is_api && (
                    <button
                      className="p-2 text-[#999999] cursor-not-allowed opacity-50"
                      title="Public holidays cannot be edited"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-[13px] text-[#999999]">No holidays added yet</div>
          )}
        </div>

        {/* Pagination placeholder */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button className="w-8 h-8 flex items-center justify-center rounded-full text-[#999999] hover:bg-[#F7F7F7] disabled:opacity-50" disabled>
            &lt;
          </button>
          <div className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#ff3b3b] text-[#ff3b3b] font-bold text-[13px]">
            1
          </div>
          <button className="w-8 h-8 flex items-center justify-center rounded-full text-[#999999] hover:bg-[#F7F7F7]">
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
