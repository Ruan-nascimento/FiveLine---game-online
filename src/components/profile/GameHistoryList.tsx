"use client";

import Link from "next/link";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import type { OnlineGameRecord, PlayerProfile } from "@/features/multiplayer/types";

export type HistoryResult = "Vitória" | "Derrota" | "Empate";

export function resultFor(game: OnlineGameRecord, userId: string): HistoryResult {
  if (game.result === "draw") return "Empate";
  return game.winner_player_id === userId ? "Vitória" : "Derrota";
}

function pieceFor(game: OnlineGameRecord, userId: string): 1 | 2 {
  return game.black_player_id === userId ? 1 : 2;
}

function moveCounts(game: OnlineGameRecord): { black: number; white: number } {
  return {
    black: Math.ceil(game.move_count / 2),
    white: Math.floor(game.move_count / 2),
  };
}

function nick(profile: PlayerProfile | undefined): string {
  return profile?.display_name?.trim() || profile?.username || "Jogador";
}

export function GameHistoryList({
  games,
  viewerId,
  profiles,
}: {
  games: OnlineGameRecord[];
  viewerId: string;
  profiles: Record<string, PlayerProfile>;
}): React.ReactElement {
  if (games.length === 0) {
    return <p className="muted">Nenhuma partida concluída ainda.</p>;
  }

  return (
    <div className="history-list">
      {games.map((game) => {
        const outcome = resultFor(game, viewerId);
        const myPiece = pieceFor(game, viewerId);
        const opponentId = myPiece === 1 ? game.white_player_id : game.black_player_id;
        const opponent = opponentId ? profiles[opponentId] : undefined;
        const opponentName = nick(opponent);
        const counts = moveCounts(game);
        const myMoves = myPiece === 1 ? counts.black : counts.white;
        const theirMoves = myPiece === 1 ? counts.white : counts.black;

        return (
          <article key={game.id} className={`history-card result-${outcome === "Vitória" ? "win" : outcome === "Derrota" ? "loss" : "draw"}`}>
            <div className="history-card-main">
              <span className="history-result">{outcome}</span>

              <div className="history-pieces" aria-label="Cores das peças">
                <span className="history-piece-block">
                  <span className={`player-stone stone-${myPiece}`} />
                  <span>Você</span>
                </span>
                <span className="history-vs">vs</span>
                <span className="history-piece-block">
                  <span className={`player-stone stone-${myPiece === 1 ? 2 : 1}`} />
                  <span>Adversário</span>
                </span>
              </div>

              {opponentId ? (
                <Link href={`/jogador/${opponent?.username ?? opponentId}`} className="history-opponent" title={`Ver perfil de ${opponentName}`}>
                  <PlayerAvatar src={opponent?.avatar_key} name={opponentName} size={36} />
                  <span>
                    <strong>{opponentName}</strong>
                    <small>@{opponent?.username ?? "jogador"}</small>
                  </span>
                </Link>
              ) : (
                <div className="history-opponent muted">
                  <PlayerAvatar src={null} name="?" size={36} />
                  <span>
                    <strong>Adversário ausente</strong>
                    <small>Conta removida</small>
                  </span>
                </div>
              )}

              <div className="history-moves">
                <span>
                  <strong>{myMoves}</strong> suas jogadas
                </span>
                <span>
                  <strong>{theirMoves}</strong> do adversário
                </span>
              </div>

              <time className="history-date">
                {game.finished_at ? new Date(game.finished_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—"}
              </time>
            </div>
          </article>
        );
      })}
    </div>
  );
}
