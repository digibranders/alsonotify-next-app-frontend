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
      {/* Responsive widget grid: mobile stack; tablet/small laptop: Progress full, Meetings|Leaves one row, Notes full below; xl: Progress+Meetings row 1, Notes+Leaves row 2 */}
      <div className="flex-1 flex flex-col gap-5 overflow-y-auto xl:overflow-hidden min-h-0 pr-1 xl:pr-0">
        {/* Desktop Layout (>1280px) - Two-column flex with relative vertical scaling */}
        <div className="hidden xl:flex gap-5 flex-1 h-full min-h-[500px] overflow-y-auto overflow-x-hidden">
          {/* Main Column (2/3) */}
          <div className="flex-[2] flex flex-col gap-5 h-full min-w-0">
            <div className="flex-[0.6] min-h-[320px]">
              <ProgressWidget onNavigate={handleProgressNavigate} />
            </div>
            <div className="flex-[0.4] min-h-0">
              <NotesWidget />
            </div>
          </div>
          {/* Sidebar Column (1/3) */}
          <div className="flex-[1] flex flex-col gap-5 h-full min-w-0">
            <div className="flex-[0.6] min-h-0">
              <MeetingsWidget onNavigate={() => router.push('/dashboard/calendar')} />
            </div>
            <div className="flex-[0.4] min-h-0">
              <LeavesWidget onNavigate={() => router.push('/dashboard/leaves')} />
            </div>
          </div>
        </div>

        {/* Tablet & Mobile Layout (<1280px) - Specific ordering using grid col-spans */}
        <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 overflow-y-auto pr-1">
          {/* Row 1: Progress (Full width on tablet/mobile) */}
          <div className="col-span-1 md:col-span-2">
            <ProgressWidget onNavigate={handleProgressNavigate} />
          </div>
          {/* Row 2: Meetings & Leaves (Side-by-side on tablet, stacked on mobile) */}
          <div className="col-span-1">
            <MeetingsWidget onNavigate={() => router.push('/dashboard/calendar')} />
          </div>
          <div className="col-span-1">
            <LeavesWidget onNavigate={() => router.push('/dashboard/leaves')} />
          </div>
          {/* Row 3: Notes (Full width on tablet/mobile) */}
          <div className="col-span-1 md:col-span-2">
            <NotesWidget />
          </div>
        </div>
      </div>
    </>
  );
}
