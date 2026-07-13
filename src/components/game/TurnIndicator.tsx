import type { Player } from "@/features/game/types";

export function TurnIndicator({ player, label }: { player: Player; label: string }): React.ReactElement {
  return <p className="turn-indicator"><span className={`mini-stone stone-${player}`} aria-hidden="true" /> <strong>{label}</strong> joga com as peças {player === 1 ? "pretas" : "brancas"}.</p>;
}
