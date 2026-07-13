"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AI_THINKING_MIN_MS } from "@/lib/constants/app";
import { chooseAIMove, getFallbackMove } from "../ai/ai";
import { applyMove, checkWinner, createEmptyBoard, isBoardFull, isValidMove } from "../engine";
import type { AIDifficulty, AIResponse, Board, GameResult, MovePosition, Player, WinningLine } from "../types";

export interface AIGameOptions {
  difficulty: AIDifficulty;
  localPlayer: Player;
}

interface AIGameState {
  board: Board;
  currentPlayer: Player;
  lastMove: MovePosition | null;
  winningLine: WinningLine;
  result: GameResult | null;
  moveCount: number;
}

function initialState(): AIGameState {
  return { board: createEmptyBoard(), currentPlayer: 1, lastMove: null, winningLine: [], result: null, moveCount: 0 };
}

export function useAIGame({ difficulty, localPlayer }: AIGameOptions) {
  const [state, setState] = useState<AIGameState>(initialState);
  const [isThinking, setIsThinking] = useState(false);
  const pendingRef = useRef(false);
  const aiPlayer: Player = localPlayer === 1 ? 2 : 1;

  const commitMove = useCallback((row: number, col: number, player: Player) => {
    setState((previous) => {
      if (previous.result || previous.currentPlayer !== player || !isValidMove(previous.board, row, col)) return previous;
      const board = applyMove(previous.board, { row, col, player });
      const winner = checkWinner(board, { row, col, player });
      return {
        board,
        currentPlayer: player === 1 ? 2 : 1,
        lastMove: { row, col },
        winningLine: winner.winningLine,
        result: winner.hasWinner ? { type: "win", winner: player } : isBoardFull(board) ? { type: "draw", winner: null } : null,
        moveCount: previous.moveCount + 1,
      };
    });
  }, []);

  const play = useCallback((row: number, col: number) => commitMove(row, col, localPlayer), [commitMove, localPlayer]);

  useEffect(() => {
    if (state.result || state.currentPlayer !== aiPlayer || pendingRef.current) return;
    pendingRef.current = true;
    setIsThinking(true);
    const request = { board: state.board, aiPlayer, difficulty };
    const startedAt = performance.now();
    let worker: Worker | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const finish = (response: AIResponse) => {
      const remaining = Math.max(0, AI_THINKING_MIN_MS - (performance.now() - startedAt));
      timeoutId = setTimeout(() => {
        if (!cancelled) commitMove(response.move.row, response.move.col, aiPlayer);
        pendingRef.current = false;
        setIsThinking(false);
        worker?.terminate();
      }, remaining);
    };

    try {
      worker = new Worker(new URL("../ai/ai.worker.ts", import.meta.url));
      worker.onmessage = (event: MessageEvent<{ success: boolean; data?: AIResponse }>) => finish(event.data.success && event.data.data ? event.data.data : { move: getFallbackMove(state.board, aiPlayer) });
      worker.onerror = () => finish({ move: getFallbackMove(state.board, aiPlayer) });
      worker.postMessage(request);
    } catch {
      finish(chooseAIMove(request));
    }
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      worker?.terminate();
    };
  }, [aiPlayer, commitMove, difficulty, state.board, state.currentPlayer, state.result]);

  const restart = useCallback(() => {
    pendingRef.current = false;
    setIsThinking(false);
    setState(initialState());
  }, []);

  const resign = useCallback(() => {
    setState((previous) => previous.result ? previous : { ...previous, result: { type: "resignation", winner: aiPlayer } });
  }, [aiPlayer]);

  return { ...state, aiPlayer, isThinking, play, restart, resign };
}
