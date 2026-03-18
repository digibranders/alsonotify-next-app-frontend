import { Tooltip, Popover } from 'antd';
import type { TeamsChatMessageReaction } from '@/services/teams';

const REACTION_MAP: Record<string, string> = {
  like: '\uD83D\uDC4D',
  heart: '\u2764\uFE0F',
  laugh: '\uD83D\uDE02',
  surprised: '\uD83D\uDE2E',
  sad: '\uD83D\uDE22',
  angry: '\uD83D\uDE21',
};

const REACTION_LABELS: Record<string, string> = {
  like: 'Like',
  heart: 'Love',
  laugh: 'Laugh',
  surprised: 'Surprised',
  sad: 'Sad',
  angry: 'Angry',
};

interface ReactionPillsProps {
  reactions?: TeamsChatMessageReaction[];
}

export function ReactionPills({ reactions }: ReactionPillsProps) {
  if (!reactions || reactions.length === 0) return null;

  // Group by reaction type
  const grouped = reactions.reduce<Record<string, string[]>>((acc, r) => {
    if (!acc[r.reactionType]) acc[r.reactionType] = [];
    acc[r.reactionType].push(r.user.displayName);
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-1 mt-1">
      {Object.entries(grouped).map(([type, users]) => (
        <Tooltip
          key={type}
          title={users.join(', ')}
        >
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#F7F7F7] border border-[#EEEEEE] rounded-full text-xs cursor-default hover:bg-[#EEEEEE] transition-colors">
            <span>{REACTION_MAP[type] || type}</span>
            {users.length > 1 && (
              <span className="text-[#666666]">{users.length}</span>
            )}
          </span>
        </Tooltip>
      ))}
    </div>
  );
}

interface ReactionPickerProps {
  onSelect: (reactionType: string) => void;
  children: React.ReactNode;
}

export function ReactionPicker({ onSelect, children }: ReactionPickerProps) {
  const content = (
    <div className="flex items-center gap-1">
      {Object.entries(REACTION_MAP).map(([type, emoji]) => (
        <Tooltip key={type} title={REACTION_LABELS[type]}>
          <button
            onClick={() => onSelect(type)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors text-base cursor-pointer"
          >
            {emoji}
          </button>
        </Tooltip>
      ))}
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="top" arrow={false}>
      {children}
    </Popover>
  );
}
