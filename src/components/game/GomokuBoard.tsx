"use client";

import { memo, useState } from "react";
import type { Board, MovePosition, Player, WinningLine } from "@/features/game/types";

interface GomokuBoardProps {
  board: Board;
  currentPlayer: Player;
  disabled?: boolean;
  lastMove?: MovePosition | null;
  winningLine?: WinningLine;
  onCellClick?: (row: number, col: number) => void;
}

function samePosition(first: MovePosition | null | undefined, row: number, col: number): boolean {
  return first?.row === row && first.col === col;
}

const GameCell = memo(function GameCell({
  value, row, col, currentPlayer, disabled, lastMove, isWinner, onClick,
}: {
  value: 0 | 1 | 2;
  row: number;
  col: number;
  currentPlayer: Player;
  disabled: boolean;
  lastMove?: MovePosition | null;
  isWinner: boolean;
  onClick?: (row: number, col: number) => void;
}): React.ReactElement {
  const [hovered, setHovered] = useState(false);
  const preview = value === 0 && hovered && !disabled ? currentPlayer : 0;
  const piece = value || preview;
  const label = value ? `Linha ${row + 1}, coluna ${col + 1}, ocupada por ${value === 1 ? "preto" : "branco"}` : `Jogar na linha ${row + 1}, coluna ${col + 1}`;
  return (
    <button
      type="button"
      className={`board-cell ${samePosition(lastMove, row, col) ? "last-move" : ""} ${isWinner ? "winning-cell" : ""}`}
      aria-label={label}
      disabled={disabled || value !== 0}
      onClick={() => onClick?.(row, col)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {piece !== 0 ? <span className={`stone stone-${piece} ${value === 0 ? "preview" : ""}`} aria-hidden="true" /> : null}
    </button>
  );
});

/** UI-only, reusable 15 × 15 board. Rules and persistence stay outside this component. */
export function GomokuBoard({ board, currentPlayer, disabled = false, lastMove, winningLine = [], onCellClick }: GomokuBoardProps): React.ReactElement {
  const winners = new Set(winningLine.map(({ row, col }) => `${row}:${col}`));
  return (
    <div className="board-frame">
      <div className="gomoku-board" role="grid" aria-label="Tabuleiro de Gomoku">
        {board.map((line, row) => line.map((cell, col) => (
          <GameCell
            key={`${row}:${col}`}
            value={cell}
            row={row}
            col={col}
            currentPlayer={currentPlayer}
            disabled={disabled}
            lastMove={lastMove}
            isWinner={winners.has(`${row}:${col}`)}
            onClick={onCellClick}
          />
        )))}
      </div>
    </div>
  );
}
