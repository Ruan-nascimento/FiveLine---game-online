export type Cell = 0 | 1 | 2;
export type Player = Exclude<Cell, 0>;
export type Board = Cell[][];
export type AIDifficulty = "easy" | "medium" | "hard";

export interface MovePosition {
  row: number;
  col: number;
}

export interface Move extends MovePosition {
  player: Player;
}

export type WinningLine = MovePosition[];

export interface WinCheckResult {
  hasWinner: boolean;
  winningLine: WinningLine;
}

export interface GameResult {
  type: "win" | "draw" | "resignation" | "disconnect";
  winner: Player | null;
}

export interface AIRequest {
  board: Board;
  aiPlayer: Player;
  difficulty: AIDifficulty;
}

export interface AIResponse {
  move: MovePosition;
  evaluation?: number;
  calculationTimeMs?: number;
}
