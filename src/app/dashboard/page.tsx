'use client';

import { useRouter } from 'next/navigation';

import { ProgressWidget } from '../../components/dashboard/ProgressWidget';
import { MeetingsWidget } from '../../components/dashboard/MeetingsWidget';
import { LeavesWidget } from '../../components/dashboard/LeavesWidget';
import { NotesWidget } from '../../components/dashboard/NotesWidget';

// ... (imports)

export default function DashboardPage() {
  const router = useRouter();

  const handleProgressNavigate = (page: string) => {
    if (page.startsWith('requirements')) {
      const queryPart = page.includes('?') ? page.substring(page.indexOf('?')) : '';
      router.push(`/dashboard/requirements${queryPart}`);
    } else if (page.startsWith('tasks')) {
      const queryPart = page.includes('?') ? page.substring(page.indexOf('?')) : '';
      router.push(`/dashboard/tasks${queryPart}`);
    }
  };

  return (
    <>
      {/* Dashboard: consistent 12px gap; horizontal padding from layout wrapper on mobile; extra bottom padding for fixed task bar. */}
      <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 flex-1 overflow-y-auto overflow-x-hidden min-h-0 pb-32 sm:pb-0">
          {/* Progress cell: no overflow-hidden so row height fits all 3 cards (Requirements, Tasks, Hours Capacity) on small screens */}
          <div className="col-span-1 md:col-span-2 xl:col-span-2 flex flex-col min-h-[200px]">
            <ProgressWidget onNavigate={handleProgressNavigate} />
          </div>
          <div className="col-span-1 flex flex-col min-h-[200px] overflow-hidden">
            <MeetingsWidget onNavigate={() => router.push('/dashboard/calendar')} />
          </div>
          <div className="col-span-1 xl:row-start-2 xl:col-start-3 flex flex-col min-h-[200px] overflow-hidden">
            <LeavesWidget onNavigate={() => router.push('/dashboard/leaves')} />
          </div>
          <div className="col-span-1 md:col-span-2 xl:row-start-2 xl:col-span-2 flex flex-col min-h-[200px] overflow-hidden">
            <NotesWidget />
          </div>
        </div>
      </div>
    </>
  );
}
