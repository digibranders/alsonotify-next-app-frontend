import { Plus, Edit, Trash2, Lock } from 'lucide-react';
import { Input, Button } from "antd";
import { useState } from 'react';
import { CompanyLeaveSetting } from '@/types/auth';
import { Holiday } from '@/types/domain';

interface LeavesTabProps {
  leaves: CompanyLeaveSetting[];
  handleUpdateLeaveCount: (id: string, count: string) => void;
  handleAddLeaveType: (name: string) => void;
  handleDeleteLeaveType: (id: string | number) => void;
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
  handleAddLeaveType,
  handleDeleteLeaveType,
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
  const [newLeaveName, setNewLeaveName] = useState('');

  const onAddLeaveTypeClick = () => {
    handleAddLeaveType(newLeaveName);
    setNewLeaveName('');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 grid grid-cols-2 gap-12">
      {/* Leaves Column */}
      <div className="space-y-6 sticky top-0 self-start">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-[#111111]">Leaves</h2>
        </div>

        {leaves.map((leave) => (
          <div key={leave.id} className="space-y-2 group/leave">
            <div className="flex items-center justify-between">
              <span className="text-[0.8125rem] font-bold text-[#111111]">{leave.name}</span>
              {canEditLeaves && isEditing && leaves.length > 1 && (
                <button
                  onClick={() => handleDeleteLeaveType(leave.id)}
                  className="p-1 text-[#ff3b3b] hover:bg-[#FFF5F5] rounded transition-colors opacity-0 group-hover/leave:opacity-100"
                  title="Delete Leave Type"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Input
                value={leave.count}
                onChange={(e) => handleUpdateLeaveCount(String(leave.id), e.target.value)}
                disabled={!canEditLeaves || !isEditing}
                className={`h-11 rounded-lg border-[#EEEEEE] focus:border-[#ff3b3b] font-medium text-[0.8125rem] ${!isEditing ? 'bg-[#F7F7F7] cursor-not-allowed' : 'bg-white'}`}
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

        {canEditLeaves && isEditing && (
          <div className="pt-4 border-t border-[#EEEEEE] space-y-3">
            <span className="text-[0.8125rem] font-bold text-[#111111]">Add Custom Leave Type</span>
            <div className="flex flex-col gap-2">
              <Input
                placeholder="E.g., Birthday Leave, Paternity Leave"
                value={newLeaveName}
                onChange={(e) => setNewLeaveName(e.target.value)}
                className="h-11 rounded-lg border-[#EEEEEE] font-medium text-[0.8125rem]"
              />
              <Button
                onClick={onAddLeaveTypeClick}
                disabled={!newLeaveName.trim()}
                className="bg-[#111111] text-white hover:bg-[#000000]/90 h-10 rounded-lg justify-self-start self-start w-auto px-6"
              >
                Add
              </Button>
            </div>
          </div>
        )}

        <div className="pt-6 space-y-6">
          <div className="space-y-2">
            <span className="text-[0.8125rem] font-bold text-[#666666]">Total Leaves</span>
            <div className="h-11 px-3 flex items-center rounded-lg border border-[#EEEEEE] bg-[#F7F7F7] text-[#666666] font-medium text-[0.8125rem]">
              {leaves.reduce((acc, curr) => acc + curr.count, 0)} days
            </div>
          </div>

        </div>
      </div>

      {/* Public Holidays Column */}
      <div className="space-y-6 border-l border-[#EEEEEE] pl-12">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-[#111111]">Public Holidays</h2>
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
            <div className="text-center py-4 text-[0.8125rem] text-[#999999]">Loading holidays...</div>
          ) : publicHolidays.length > 0 ? (
            publicHolidays.map((holiday) => (
              <div key={holiday.id} className="p-4 border border-[#EEEEEE] rounded-[12px] flex items-center justify-between bg-white hover:shadow-sm transition-shadow">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#111111]">{holiday.name}</p>
                    {holiday.is_api && (
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[0.625rem] font-bold">
                        Public
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#666666] font-medium">{new Date(holiday.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!holiday.is_api && (
                    <>
                      {canEditLeaves && isEditing && (
                        <button
                          onClick={() => handleEditHoliday(holiday)}
                          className="p-2 text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] rounded-full transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canEditLeaves && isEditing && (
                        <button
                          onClick={() => handleDeleteHoliday(holiday.id)}
                          className="p-2 text-[#ff3b3b] hover:bg-[#FFF5F5] rounded-full transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                  {holiday.is_api && isEditing && (
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
            <div className="text-center py-4 text-[0.8125rem] text-[#999999]">No holidays added yet</div>
          )}
        </div>

        {/* Pagination placeholder */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button className="w-8 h-8 flex items-center justify-center rounded-full text-[#999999] hover:bg-[#F7F7F7] disabled:opacity-50" disabled>
            &lt;
          </button>
          <div className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#ff3b3b] text-[#ff3b3b] font-bold text-[0.8125rem]">
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
