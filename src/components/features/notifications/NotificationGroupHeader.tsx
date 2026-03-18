'use client';

interface GroupHeaderProps {
  label: string;
  count: number;
}

export function NotificationGroupHeader({ label, count }: GroupHeaderProps) {
  return (
    <div className="sticky top-0 z-10 px-5 py-2 bg-[#FAFAFA] border-b border-[#EEEEEE]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#999999] uppercase tracking-wider">{label}</span>
        <span className="text-2xs font-medium text-[#999999]">{count}</span>
      </div>
    </div>
  );
}
