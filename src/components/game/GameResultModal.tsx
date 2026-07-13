"use client";

import Link from "next/link";
import type { GameResult, Player } from "@/features/game/types";

export function GameResultModal({ result, localPlayer, moves, onPlayAgain }: { result: GameResult; localPlayer: Player; moves: number; onPlayAgain: () => void }): React.ReactElement {
  const won = result.winner === localPlayer;
  const title = result.type === "draw" ? "Empate" : won ? "Você venceu!" : "Partida encerrada";
  const message = result.type === "draw" ? "O tabuleiro foi preenchido sem uma sequência de cinco." : result.type === "resignation" ? (won ? "A IA desistiu da partida." : "Você desistiu da partida.") : won ? "Excelente leitura do tabuleiro." : "A IA formou uma sequência de cinco.";
  return (
    <div className="result-backdrop" role="presentation">
      <section className="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <p className="eyebrow">Partida concluída</p>
        <h2 id="result-title">{title}</h2>
        <p>{message}</p>
        <p className="muted">{moves} jogadas realizadas</p>
        <div className="action-row">
          <button className="button primary" onClick={onPlayAgain}>Jogar novamente</button>
          <Link className="button secondary" href="/jogar/ia">Alterar opções</Link>
        </div>
        <Link href="/jogar" className="text-link">Voltar ao menu</Link>
      </section>
    </div>
  );
}
