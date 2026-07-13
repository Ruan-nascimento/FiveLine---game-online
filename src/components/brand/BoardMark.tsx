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
      <rect x="2" y="2" width="28" height="28" rx="4" fill="#e4b568" stroke="#8a5a28" strokeWidth="2" />
      <path d="M8 2.5v27M16 2.5v27M24 2.5v27M2.5 8h27M2.5 16h27M2.5 24h27" stroke="#835726" strokeWidth="1.1" opacity=".7" />
      <circle cx="8" cy="8" r="2.35" fill="#12181d" />
      <circle cx="16" cy="16" r="2.35" fill="#12181d" />
      <circle cx="24" cy="24" r="2.35" fill="#12181d" />
      <circle cx="24" cy="8" r="2.35" fill="#f4f7f6" stroke="#9aa3a0" strokeWidth=".6" />
      <circle cx="8" cy="24" r="2.35" fill="#f4f7f6" stroke="#9aa3a0" strokeWidth=".6" />
    </svg>
  );
}
