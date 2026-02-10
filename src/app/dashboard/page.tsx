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
      <div className="flex-1 flex flex-col gap-5 overflow-y-auto min-h-0 pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 flex-1 auto-rows-fr">
          <div className="col-span-1 md:col-span-2 xl:col-span-2 h-full min-h-0">
            <ProgressWidget onNavigate={handleProgressNavigate} />
          </div>
          <div className="col-span-1 h-full min-h-0">
            <MeetingsWidget onNavigate={() => router.push('/dashboard/calendar')} />
          </div>
          <div className="col-span-1 xl:row-start-2 xl:col-start-3 h-full min-h-0">
            <LeavesWidget onNavigate={() => router.push('/dashboard/leaves')} />
          </div>
          <div className="col-span-1 md:col-span-2 xl:row-start-2 xl:col-span-2 h-full min-h-0">
            <NotesWidget />
          </div>
        </div>
      </div>
    </>
  );
}
