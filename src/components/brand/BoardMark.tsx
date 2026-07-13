export function BoardMark({ size = 28 }: { size?: number }): React.ReactElement {
  return (
    <svg
      className="board-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="28" height="28" rx="5" fill="#12202b" stroke="#44d7b6" strokeWidth="1.6" />
      <path d="M8 3v26M16 3v26M24 3v26M3 8h26M3 16h26M3 24h26" stroke="#44d7b6" strokeWidth="1" opacity=".35" />
      <circle cx="8" cy="8" r="2.2" fill="#44d7b6" />
      <circle cx="16" cy="16" r="2.2" fill="#44d7b6" />
      <circle cx="24" cy="24" r="2.2" fill="#44d7b6" />
      <circle cx="24" cy="8" r="2.2" fill="#e8eef2" />
      <circle cx="8" cy="24" r="2.2" fill="#e8eef2" />
    </svg>
  );
}
