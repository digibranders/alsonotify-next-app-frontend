interface FormatIconProps {
  size?: number;
  className?: string;
}

/**
 * Teams-style "A with pen" formatting icon.
 * Matches the Microsoft Teams input toolbar format toggle.
 */
export function FormatIcon({ size = 16, className }: FormatIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Letter A */}
      <path
        d="M5.5 15L9 4h2l3.5 11h-1.8l-0.9-3H8.2l-0.9 3H5.5zm3.2-4.5h2.6L10 6.2 8.7 10.5z"
        fill="currentColor"
      />
      {/* Pen stroke (diagonal brush) */}
      <path
        d="M14.5 13.5l2.5-2.5c0.3-0.3 0.3-0.8 0-1.1l-0.4-0.4c-0.3-0.3-0.8-0.3-1.1 0L13 12l0.5 0.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Pen tip */}
      <path
        d="M13 12l-0.5 2 2-0.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
