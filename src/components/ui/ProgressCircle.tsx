// import svgPaths from "../imports/svg-ngq5myj286";

interface ProgressCircleProps {
  total: number;
  completed: number;
  inProgress: number;
  delayed: number;
  title: string;
  subtitle: string;
}

export function ProgressCircle({ total, completed, inProgress, delayed, title, subtitle }: ProgressCircleProps) {
  const completedPercentage = (completed / total) * 100;
  const circumference = 2 * Math.PI * 60;
  const strokeDashoffset = circumference - (completedPercentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-[24px] relative shrink-0">
      {/* Title */}
      <div className="flex flex-col font-semibold justify-center leading-[0] not-italic text-[#111111] text-xl text-nowrap">
        <p className="leading-[normal]">{title}</p>
      </div>

      {/* Progress Circle */}
      <div className="relative size-[180px]">
        <svg className="size-full -rotate-90" viewBox="0 0 140 140">
          {/* Background circle */}
          <circle
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke="#E5E5E5"
            strokeWidth="20"
          />
          {/* Progress circle */}
          <circle
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke="#0F9D58"
            strokeWidth="20"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex flex-col font-bold justify-center leading-[0] not-italic text-[#111111] text-[48px]">
            <p className="leading-[normal]">{total}</p>
          </div>
          <div className="flex flex-col font-medium font-medium justify-center leading-[0] mt-[8px] not-italic text-[#666666] text-sm text-nowrap">
            <p className="leading-[normal]">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-[40px] items-center">
        {/* Completed */}
        <div className="flex flex-col gap-[8px] items-center">
          <div className="flex flex-col font-bold justify-center leading-[0] not-italic text-[#111111] text-[1.75rem]">
            <p className="leading-[normal]">{completed}</p>
          </div>
          <div className="flex gap-[4px] items-center">
            <div className="relative shrink-0 size-[10px]">
              <svg className="block size-full" fill="none" viewBox="0 0 10 10">
                <circle cx="5" cy="5" fill="#0F9D58" r="5" />
              </svg>
            </div>
            <div className="flex flex-col font-medium font-medium justify-center leading-[0] not-italic text-[#666666] text-sm text-nowrap">
              <p className="leading-[normal] whitespace-pre">Completed</p>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="flex flex-col gap-[8px] items-center">
          <div className="flex flex-col font-bold justify-center leading-[0] not-italic text-[#111111] text-[1.75rem]">
            <p className="leading-[normal]">{inProgress}</p>
          </div>
          <div className="flex gap-[4px] items-center">
            <div className="relative shrink-0 size-[10px]">
              <svg className="block size-full" fill="none" viewBox="0 0 10 10">
                <circle cx="5" cy="5" fill="#2F80ED" r="5" />
              </svg>
            </div>
            <div className="flex flex-col font-medium font-medium justify-center leading-[0] not-italic text-[#666666] text-sm text-nowrap">
              <p className="leading-[normal] whitespace-pre">In Progress</p>
            </div>
          </div>
        </div>

        {/* Delayed */}
        <div className="flex flex-col gap-[8px] items-center">
          <div className="flex flex-col font-bold justify-center leading-[0] not-italic text-[#111111] text-[1.75rem]">
            <p className="leading-[normal]">{delayed}</p>
          </div>
          <div className="flex gap-[4px] items-center">
            <div className="relative shrink-0 size-[10px]">
              <svg className="block size-full" fill="none" viewBox="0 0 10 10">
                <circle cx="5" cy="5" fill="#ff3b3b" r="5" />
              </svg>
            </div>
            <div className="flex flex-col font-medium font-medium justify-center leading-[0] not-italic text-[#666666] text-sm text-nowrap">
              <p className="leading-[normal] whitespace-pre">Delayed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
