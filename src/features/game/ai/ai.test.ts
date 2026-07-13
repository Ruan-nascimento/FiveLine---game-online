import { describe, expect, it } from "vitest";
import { applyMove, createEmptyBoard, isValidMove } from "../engine";
import { chooseAIMove, getCandidateMoves, getFallbackMove } from "./ai";

describe("AI", () => {
  it("prefers the center on an empty board", () => {
    expect(chooseAIMove({ board: createEmptyBoard(), aiPlayer: 1, difficulty: "hard" }).move).toEqual({ row: 7, col: 7 });
  });

  it("takes an immediate win", () => {
    let board = createEmptyBoard();
    for (let col = 3; col < 7; col += 1) board = applyMove(board, { row: 7, col, player: 2 });
    expect(chooseAIMove({ board, aiPlayer: 2, difficulty: "medium" }).move).toEqual({ row: 7, col: 7 });
  });

  it("blocks an immediate win at medium and hard levels", () => {
    let board = createEmptyBoard();
    for (let row = 3; row < 7; row += 1) board = applyMove(board, { row, col: 4, player: 1 });
    const move = chooseAIMove({ board, aiPlayer: 2, difficulty: "hard" }).move;
    expect(move).toEqual({ row: 7, col: 4 });
  });

  it("returns only valid moves and leaves its input untouched", () => {
    const board = applyMove(createEmptyBoard(), { row: 7, col: 7, player: 1 });
    const before = structuredClone(board);
    const move = getFallbackMove(board, 2);
    expect(isValidMove(board, move.row, move.col)).toBe(true);
    expect(board).toEqual(before);
    expect(getCandidateMoves(board).length).toBeGreaterThan(0);
  });
});
