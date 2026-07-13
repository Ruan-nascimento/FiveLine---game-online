import type { Board, MovePosition, Player, WinningLine } from "@/features/game/types";

export interface OnlineGameRecord {
  id: string;
  status: "waiting" | "active" | "finished" | "cancelled" | "expired";
  mode: "online_quick" | "online_private";
  black_player_id: string | null;
  white_player_id: string | null;
  current_player: Player;
  board: Board;
  move_count: number;
  last_move_row: number | null;
  last_move_col: number | null;
  winning_line: WinningLine;
  winner_player_id: string | null;
  result: "black_win" | "white_win" | "draw" | null;
  result_reason: "five_in_row" | "resignation" | "disconnect" | "board_full" | null;
  room_code: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface OnlineGameState {
  gameId: string;
  status: "waiting" | "active" | "finished";
  board: Board;
  blackPlayer: string | null;
  whitePlayer: string | null;
  currentPlayer: Player;
  localPlayerPiece: Player;
  moveCount: number;
  lastMove: MovePosition | null;
  winningLine: WinningLine;
  connectionStatus: "connecting" | "connected" | "reconnecting" | "disconnected";
}
