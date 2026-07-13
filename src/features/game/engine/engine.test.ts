import { describe, expect, it } from "vitest";
import { applyMove, checkWinner, createEmptyBoard, getOpponent, isBoardFull, isValidMove } from ".";
import type { Board, Move } from "../types";

function line(moves: Move[]): Board {
  return moves.reduce((board, move) => applyMove(board, move), createEmptyBoard());
}

describe("Gomoku engine", () => {
  it("creates an independent 15 × 15 board", () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(15);
    expect(board.every((row) => row.length === 15 && row.every((cell) => cell === 0))).toBe(true);
  });

  it("applies a valid move without mutating the original board", () => {
    const board = createEmptyBoard();
    const next = applyMove(board, { row: 3, col: 4, player: 1 });
    expect(board[3][4]).toBe(0);
    expect(next[3][4]).toBe(1);
    expect(isValidMove(next, 3, 4)).toBe(false);
    expect(() => applyMove(next, { row: 3, col: 4, player: 2 })).toThrow("INVALID_MOVE");
  });

  it.each([
    ["horizontal", 0, 1],
    ["vertical", 1, 0],
    ["descending diagonal", 1, 1],
    ["ascending diagonal", 1, -1],
  ])("finds a %s win", (_name, rowStep, colStep) => {
    const startCol = colStep === -1 ? 8 : 3;
    const moves = Array.from({ length: 5 }, (_, index) => ({ row: 3 + index * rowStep, col: startCol + index * colStep, player: 1 as const }));
    const board = line(moves);
    const result = checkWinner(board, moves[4]);
    expect(result.hasWinner).toBe(true);
    expect(result.winningLine).toHaveLength(5);
  });

  it("detects six or more pieces but not interrupted sequences", () => {
    const winning = line(Array.from({ length: 6 }, (_, col) => ({ row: 5, col, player: 2 as const })));
    expect(checkWinner(winning, { row: 5, col: 5, player: 2 }).winningLine).toHaveLength(6);
    const interrupted = line([{ row: 2, col: 1, player: 1 }, { row: 2, col: 2, player: 1 }, { row: 2, col: 3, player: 1 }, { row: 2, col: 5, player: 1 }, { row: 2, col: 6, player: 1 }]);
    expect(checkWinner(interrupted, { row: 2, col: 6, player: 1 }).hasWinner).toBe(false);
  });

  it("reports full boards and switches players", () => {
    const full = createEmptyBoard().map((row, rowIndex) => row.map((_, colIndex) => ((rowIndex + colIndex) % 2 ? 1 : 2))) as Board;
    expect(isBoardFull(full)).toBe(true);
    expect(getOpponent(1)).toBe(2);
    expect(getOpponent(2)).toBe(1);
  });
});
