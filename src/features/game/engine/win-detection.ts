import { BOARD_SIZE, WIN_LENGTH } from "@/lib/constants/app";
import type { Board, Move, MovePosition, WinningLine, WinCheckResult } from "../types";

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

function inside(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function collect(board: Board, lastMove: Move, rowStep: number, colStep: number): MovePosition[] {
  const before: MovePosition[] = [];
  const after: MovePosition[] = [];
  let row = lastMove.row - rowStep;
  let col = lastMove.col - colStep;

  while (inside(row, col) && board[row][col] === lastMove.player) {
    before.unshift({ row, col });
    row -= rowStep;
    col -= colStep;
  }

  row = lastMove.row + rowStep;
  col = lastMove.col + colStep;
  while (inside(row, col) && board[row][col] === lastMove.player) {
    after.push({ row, col });
    row += rowStep;
    col += colStep;
  }

  return [...before, { row: lastMove.row, col: lastMove.col }, ...after];
}

/** Checks only lines crossing the supplied final move, keeping the operation small and deterministic. */
export function checkWinner(board: Board, lastMove: Move): WinCheckResult {
  if (!inside(lastMove.row, lastMove.col) || board[lastMove.row][lastMove.col] !== lastMove.player) {
    return { hasWinner: false, winningLine: [] };
  }

  for (const [rowStep, colStep] of DIRECTIONS) {
    const line = collect(board, lastMove, rowStep, colStep);
    if (line.length >= WIN_LENGTH) return { hasWinner: true, winningLine: line as WinningLine };
  }
  return { hasWinner: false, winningLine: [] };
}
