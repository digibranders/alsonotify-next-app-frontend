import { Tooltip } from 'antd';

export type PresenceAvailability =
  | 'Available'
  | 'AvailableIdle'
  | 'Busy'
  | 'BusyIdle'
  | 'DoNotDisturb'
  | 'BeRightBack'
  | 'Away'
  | 'Offline'
  | 'PresenceUnknown';

interface PresenceIndicatorProps {
  availability: PresenceAvailability;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const PRESENCE_CONFIG: Record<string, { color: string; label: string }> = {
  Available:       { color: 'bg-[#0F9D58]', label: 'Available' },
  AvailableIdle:   { color: 'bg-[#0F9D58]', label: 'Available' },
  Busy:            { color: 'bg-[#ff3b3b]', label: 'Busy' },
  BusyIdle:        { color: 'bg-[#ff3b3b]', label: 'Busy' },
  DoNotDisturb:    { color: 'bg-[#ff3b3b]', label: 'Do Not Disturb' },
  BeRightBack:     { color: 'bg-[#FFAB00]', label: 'Be Right Back' },
  Away:            { color: 'bg-[#FFAB00]', label: 'Away' },
  Offline:         { color: 'bg-[#999999]', label: 'Offline' },
  PresenceUnknown: { color: 'bg-[#999999]', label: 'Unknown' },
};

const SIZE_MAP = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export function PresenceIndicator({
  availability,
  size = 'md',
  className = '',
}: PresenceIndicatorProps) {
  const config = PRESENCE_CONFIG[availability] || PRESENCE_CONFIG.PresenceUnknown;

  return (
    <Tooltip title={config.label}>
      <span
        className={`inline-block rounded-full ${config.color} ${SIZE_MAP[size]} ring-2 ring-white ${className}`}
      />
    </Tooltip>
  );
}
