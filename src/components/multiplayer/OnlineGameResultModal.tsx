"use client";

import type { Board, WinningLine } from "@/features/game/types";

export function BoardPreview({
  board,
  winningLine = [],
  lastMove,
}: {
  board: Board;
  winningLine?: WinningLine;
  lastMove?: { row: number; col: number } | null;
}): React.ReactElement {
  const winners = new Set(winningLine.map(({ row, col }) => `${row}:${col}`));
  return (
    <div className="board-preview" aria-hidden="true">
      <div className="board-preview-grid">
        {board.map((line, row) =>
          line.map((cell, col) => {
            const key = `${row}:${col}`;
            const classes = [
              "board-preview-cell",
              cell ? `piece-${cell}` : "",
              winners.has(key) ? "winner" : "",
              lastMove?.row === row && lastMove.col === col ? "last" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return <span key={key} className={classes} />;
          }),
        )}
      </div>
    </div>
  );
}

function resultReasonText(reason: string | null): string {
  switch (reason) {
    case "five_in_row":
      return "Sequência de cinco peças formada.";
    case "resignation":
      return "Um jogador desistiu da partida.";
    case "disconnect":
      return "Adversário desconectado por muito tempo.";
    case "turn_timeout":
      return "Um jogador ficou sem tempo no turno.";
    case "board_full":
      return "Tabuleiro preenchido sem vencedor.";
    default:
      return "Partida encerrada.";
  }
}

export function OnlineGameResultModal({
  winnerName,
  loserName,
  isWinner,
  isDraw,
  board,
  winningLine,
  lastMove,
  resultReason,
  rematchPending,
  opponentRematch,
  autoCloseSeconds,
  onRematch,
  onExit,
}: {
  winnerName: string;
  loserName: string;
  isWinner: boolean;
  isDraw: boolean;
  board: Board;
  winningLine: WinningLine;
  lastMove: { row: number; col: number } | null;
  resultReason: string | null;
  rematchPending: boolean;
  opponentRematch: boolean;
  autoCloseSeconds: number;
  onRematch: () => void;
  onExit: () => void | Promise<void>;
}): React.ReactElement {
  const title = isDraw ? "Empate!" : isWinner ? "Você venceu!" : "Você perdeu";
  const subtitle = isDraw
    ? `${winnerName} e ${loserName} empataram.`
    : isWinner
      ? `${loserName} foi derrotado.`
      : `${winnerName} venceu a partida.`;

  return (
    <div className="result-backdrop" role="presentation">
      <section className="result-modal online-result-modal" role="dialog" aria-modal="true" aria-labelledby="online-result-title">
        <p className="eyebrow">Partida concluída</p>
        <h2 id="online-result-title">{title}</h2>
        <p>{subtitle}</p>
        <p className="muted">{resultReasonText(resultReason)}</p>
        <BoardPreview board={board} winningLine={winningLine} lastMove={lastMove} />
        <p className="result-countdown muted">
          {rematchPending
            ? `Aguardando o adversário… (${autoCloseSeconds}s)`
            : opponentRematch
              ? `O adversário quer revanche (${autoCloseSeconds}s)`
              : `Vocês têm ${autoCloseSeconds}s para pedir revanche.`}
        </p>
        <div className="action-row">
          <button className="button primary" onClick={onRematch} disabled={rematchPending}>
            {rematchPending ? "Aguardando adversário…" : opponentRematch ? "Aceitar revanche" : "Revanche"}
          </button>
          <button className="button secondary" onClick={onExit}>Sair</button>
        </div>
      </section>
    </div>
  );
}
