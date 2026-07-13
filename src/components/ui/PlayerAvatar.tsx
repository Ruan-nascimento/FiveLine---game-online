"use client";

export function PlayerAvatar({
  src,
  name,
  size = 28,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
}): React.ReactElement {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  if (src) {
    return (
      <img
        className="player-avatar"
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span className="player-avatar player-avatar-fallback" style={{ width: size, height: size }} aria-hidden>
      {initial}
    </span>
  );
}
