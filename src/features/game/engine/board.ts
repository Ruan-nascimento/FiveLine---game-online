import { BOARD_SIZE } from "@/lib/constants/app";
import type { Board, Move, MovePosition, Player } from "../types";

/** Creates a fresh 15 × 15 board. Every mutation operation returns a new board. */
export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => 0));
}

export function isInsideBoard(row: number, col: number): boolean {
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function isCellEmpty(board: Board, row: number, col: number): boolean {
  return isInsideBoard(row, col) && board[row]?.[col] === 0;
}

export function isValidMove(board: Board, row: number, col: number): boolean {
  return isCellEmpty(board, row, col);
}

export function applyMove(board: Board, move: Move): Board {
  if (!isValidMove(board, move.row, move.col)) {
    throw new Error("INVALID_MOVE");
  }

  return board.map((line, row) =>
    row === move.row ? line.map((cell, col) => (col === move.col ? move.player : cell)) : [...line],
  );
}

export function getAvailableMoves(board: Board): MovePosition[] {
  const moves: MovePosition[] = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] === 0) moves.push({ row, col });
    }
  }
  return moves;
}

export function isBoardFull(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell !== 0));
}

export function getOpponent(player: Player): Player {
  return player === 1 ? 2 : 1;
}
