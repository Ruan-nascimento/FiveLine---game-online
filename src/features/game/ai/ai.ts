import { HARD_AI_TIME_LIMIT_MS } from "@/lib/constants/app";
import { applyMove, checkWinner, getAvailableMoves, getOpponent, isValidMove } from "../engine";
import type { AIRequest, AIResponse, Board, MovePosition, Player } from "../types";

const PATTERN_SCORES = [0, 0, 50, 2_000, 100_000, 10_000_000];

function key(move: MovePosition): string {
  return `${move.row}:${move.col}`;
}

function centerDistance(move: MovePosition): number {
  return Math.abs(move.row - 7) + Math.abs(move.col - 7);
}

export function getCandidateMoves(board: Board, radius = 2): MovePosition[] {
  const candidates = new Map<string, MovePosition>();
  let hasPieces = false;
  board.forEach((line, row) => line.forEach((cell, col) => {
    if (cell === 0) return;
    hasPieces = true;
    for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
      for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
        const candidate = { row: row + rowOffset, col: col + colOffset };
        if (isValidMove(board, candidate.row, candidate.col)) candidates.set(key(candidate), candidate);
      }
    }
  }));
  if (!hasPieces) return [{ row: 7, col: 7 }];
  return [...candidates.values()].sort((a, b) => centerDistance(a) - centerDistance(b));
}

function contiguousLength(board: Board, row: number, col: number, player: Player, rowStep: number, colStep: number): number {
  let count = 1;
  for (const sign of [-1, 1]) {
    let nextRow = row + rowStep * sign;
    let nextCol = col + colStep * sign;
    while (nextRow >= 0 && nextRow < 15 && nextCol >= 0 && nextCol < 15 && board[nextRow][nextCol] === player) {
      count += 1;
      nextRow += rowStep * sign;
      nextCol += colStep * sign;
    }
  }
  return count;
}

function scorePosition(board: Board, move: MovePosition, player: Player): number {
  const placed = applyMove(board, { ...move, player });
  const opponent = getOpponent(player);
  let score = 14 - centerDistance(move);
  for (const [rowStep, colStep] of [[1, 0], [0, 1], [1, 1], [1, -1]] as const) {
    const own = Math.min(5, contiguousLength(placed, move.row, move.col, player, rowStep, colStep));
    const threat = Math.min(5, contiguousLength(applyMove(board, { ...move, player: opponent }), move.row, move.col, opponent, rowStep, colStep));
    score += PATTERN_SCORES[own] + PATTERN_SCORES[threat] * 0.85;
  }
  return score;
}

function immediateMove(board: Board, player: Player, candidates: MovePosition[]): MovePosition | undefined {
  return candidates.find((move) => checkWinner(applyMove(board, { ...move, player }), { ...move, player }).hasWinner);
}

function orderedMoves(board: Board, player: Player, limit = 14): Array<{ move: MovePosition; score: number }> {
  return getCandidateMoves(board).map((move) => ({ move, score: scorePosition(board, move, player) }))
    .sort((a, b) => b.score - a.score || centerDistance(a.move) - centerDistance(b.move)).slice(0, limit);
}

function negamax(board: Board, player: Player, depth: number, alpha: number, beta: number, startedAt: number): number {
  if (performance.now() - startedAt >= HARD_AI_TIME_LIMIT_MS || depth === 0) return orderedMoves(board, player, 1)[0]?.score ?? 0;
  const opponent = getOpponent(player);
  let best = -Infinity;
  let lower = alpha;
  for (const { move } of orderedMoves(board, player, 10)) {
    const next = applyMove(board, { ...move, player });
    if (checkWinner(next, { ...move, player }).hasWinner) return 9_000_000 + depth;
    const score = -negamax(next, opponent, depth - 1, -beta, -lower, startedAt);
    best = Math.max(best, score);
    lower = Math.max(lower, score);
    if (lower >= beta) break;
  }
  return best === -Infinity ? 0 : best;
}

export function chooseAIMove({ board, aiPlayer, difficulty }: AIRequest): AIResponse {
  const startedAt = performance.now();
  const candidates = getCandidateMoves(board);
  const winning = immediateMove(board, aiPlayer, candidates);
  const block = immediateMove(board, getOpponent(aiPlayer), candidates);
  let selected: MovePosition;

  if (winning) selected = winning;
  else if (block && difficulty !== "easy") selected = block;
  else {
    const moves = orderedMoves(board, aiPlayer);
    if (moves.length === 0) throw new Error("NO_AVAILABLE_MOVE");
    if (difficulty === "easy") {
      const pool = moves.slice(0, Math.min(5, moves.length));
      selected = Math.random() < 0.7 ? pool[Math.floor(Math.random() * pool.length)].move : moves[Math.min(8, moves.length - 1)].move;
    } else if (difficulty === "medium") selected = moves[0].move;
    else {
      selected = moves[0].move;
      let best = -Infinity;
      for (const { move } of moves.slice(0, 8)) {
        const score = -negamax(applyMove(board, { ...move, player: aiPlayer }), getOpponent(aiPlayer), 2, -Infinity, Infinity, startedAt);
        if (score > best) {
          best = score;
          selected = move;
        }
        if (performance.now() - startedAt >= HARD_AI_TIME_LIMIT_MS) break;
      }
    }
  }
  return { move: selected, evaluation: scorePosition(board, selected, aiPlayer), calculationTimeMs: performance.now() - startedAt };
}

/** Synchronous, always-valid recovery path when a browser Worker is unavailable. */
export function getFallbackMove(board: Board, player: Player): MovePosition {
  const candidates = getCandidateMoves(board);
  return immediateMove(board, player, candidates) ?? immediateMove(board, getOpponent(player), candidates) ?? candidates[0] ?? getAvailableMoves(board)[0];
}
