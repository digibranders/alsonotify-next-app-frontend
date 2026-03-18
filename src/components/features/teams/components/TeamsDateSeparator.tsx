import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

interface TeamsDateSeparatorProps {
  date: string;
}

function getDateLabel(date: string): string {
  const d = dayjs(date);
  if (d.isToday()) return 'Today';
  if (d.isYesterday()) return 'Yesterday';
  const now = dayjs();
  if (d.isAfter(now.subtract(7, 'day'))) return d.format('dddd');
  if (d.year() === now.year()) return d.format('MMMM D');
  return d.format('MMMM D, YYYY');
}

export function TeamsDateSeparator({ date }: TeamsDateSeparatorProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 h-px bg-[#EEEEEE]" />
      <span className="text-xs font-medium text-[#999999] whitespace-nowrap select-none">
        {getDateLabel(date)}
      </span>
      <div className="flex-1 h-px bg-[#EEEEEE]" />
    </div>
  );
}
