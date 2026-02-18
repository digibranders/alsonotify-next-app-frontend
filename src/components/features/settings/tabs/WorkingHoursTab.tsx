import { X, Plus } from 'lucide-react';
import { Input } from "antd";

interface WorkingHoursTabProps {
  workingDays: string[];
  toggleWorkingDay: (day: string) => void;
  canEditWorkingHours: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  isSaving: boolean;
  workStartTime: string;
  setWorkStartTime: (val: string) => void;
  workEndTime: string;
  setWorkEndTime: (val: string) => void;
  breakTime: string;
  setBreakTime: (val: string) => void;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function WorkingHoursTab({
  workingDays,
  toggleWorkingDay,
  canEditWorkingHours,
  isEditing,
  onEdit,
  onSave,
  isSaving,
  workStartTime,
  setWorkStartTime,
  workEndTime,
  setWorkEndTime,
  breakTime,
  setBreakTime,
}: WorkingHoursTabProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
      <h2 className="text-base font-semibold text-[#111111] mb-6">Working Hours</h2>

      <div className="space-y-8">
        {/* Working Days */}
        <div className="space-y-3">
          <span className="text-[0.8125rem] font-bold text-[#111111]">Working Days</span>
          <div className="min-h-[48px] p-2 rounded-lg border border-[#EEEEEE] flex flex-wrap gap-2">
            {workingDays.map(day => (
              <div key={day} className={`h-8 px-3 bg-[#F0F0F0] rounded-md flex items-center gap-2 text-[0.8125rem] font-medium text-[#111111] ${!isEditing ? 'opacity-70' : ''}`}>
                {day}
                {canEditWorkingHours && isEditing && (
                  <button onClick={() => toggleWorkingDay(day)} className="hover:text-[#ff3b3b]">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {canEditWorkingHours && isEditing && (
              <div className="relative group">
                <button className="h-8 w-8 flex items-center justify-center hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5 text-[#ff3b3b]" />
                </button>
                <div className="hidden group-hover:block absolute top-full left-0 mt-1 w-40 bg-white border border-[#EEEEEE] shadow-lg rounded-lg p-1 z-10">
                  {daysOfWeek.filter(d => !workingDays.includes(d)).map(day => (
                    <button
                      key={day}
                      onClick={() => toggleWorkingDay(day)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-[#F7F7F7] rounded-md"
                    >
                      {day}
                    </button>
                  ))}
                  {daysOfWeek.filter(d => !workingDays.includes(d)).length === 0 && (
                    <div className="px-3 py-2 text-xs text-[#999999]">All days selected</div>
                  )}
                </div>
              </div>
            )}
            {canEditWorkingHours && !isEditing && (
              <button
                onClick={onEdit}
                className="h-8 px-3 text-[#ff3b3b] hover:bg-[#FFF5F5] rounded-md transition-colors text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Working Hours */}
        <div className="space-y-3">
          <span className="text-[0.8125rem] font-bold text-[#111111]">Working Hours</span>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Input
                type="time"
                value={workStartTime}
                onChange={(e) => setWorkStartTime(e.target.value)}
                disabled={!canEditWorkingHours || !isEditing}
                className={`h-11 rounded-lg border-[#EEEEEE] focus:border-[#ff3b3b] font-medium text-[0.8125rem] ${!isEditing ? 'bg-[#F7F7F7] cursor-not-allowed' : 'bg-white'}`}
              />
            </div>
            <span className="text-[0.8125rem] text-[#666666] font-medium">to</span>
            <div className="relative flex-1">
              <Input
                type="time"
                value={workEndTime}
                onChange={(e) => setWorkEndTime(e.target.value)}
                disabled={!canEditWorkingHours || !isEditing}
                className={`h-11 rounded-lg border-[#EEEEEE] focus:border-[#ff3b3b] font-medium text-[0.8125rem] ${!isEditing ? 'bg-[#F7F7F7] cursor-not-allowed' : 'bg-white'}`}
              />
            </div>
          </div>
        </div>

        {/* Break Time */}
        <div className="space-y-3">
          <span className="text-[0.8125rem] font-bold text-[#111111]">Break Time (in minutes)</span>
          <Input
            type="number"
            value={breakTime}
            onChange={(e) => setBreakTime(e.target.value)}
            disabled={!canEditWorkingHours || !isEditing}
            className={`h-11 rounded-lg border-[#EEEEEE] focus:border-[#ff3b3b] font-medium text-[0.8125rem] ${!isEditing ? 'bg-[#F7F7F7] cursor-not-allowed' : 'bg-white'}`}
          />
        </div>

      </div>
    </div>
  );
}
