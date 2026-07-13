"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Flag, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { GomokuBoard } from "@/components/game/GomokuBoard";
import { RoomCode } from "./PrivateRoom";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { moveInputSchema } from "@/lib/validations/game";
import type { GameResult, Player } from "@/features/game/types";
import type { OnlineGameRecord } from "@/features/multiplayer/types";

function statusText(game: OnlineGameRecord, localPiece: Player, connected: boolean): string {
  if (!connected) return "Reconectando…";
  if (game.status === "waiting") return "Aguardando adversário…";
  if (game.status === "finished") return "Partida concluída";
  return game.current_player === localPiece ? "Seu turno" : "Turno do adversário";
}

function toResult(game: OnlineGameRecord): GameResult | null {
  if (game.status !== "finished") return null;
  if (game.result === "draw") return { type: "draw", winner: null };
  return { type: game.result_reason === "resignation" ? "resignation" : game.result_reason === "disconnect" ? "disconnect" : "win", winner: game.result === "black_win" ? 1 : 2 };
}

function moveErrorMessage(code: string | undefined, message: string, details: string | null): string {
  if (message.includes("NOT_YOUR_TURN")) return "Ainda não é o seu turno. Aguarde o adversário jogar.";
  if (message.includes("CELL_OCCUPIED")) return "Essa posição já está ocupada. O tabuleiro foi atualizado.";
  if (message.includes("GAME_NOT_ACTIVE")) return "Esta partida não está mais ativa.";
  if (message.includes("GAME_NOT_FOUND")) return "A partida não foi encontrada.";
  if (message.includes("MOVE_OUT_OF_BOUNDS")) return "A jogada está fora do tabuleiro.";
  if (message.includes("NOT_A_PARTICIPANT") || message.includes("AUTH_REQUIRED")) return "Sua sessão não tem autorização para esta partida. Entre novamente.";
  if (code === "PGRST202") return "A função de jogada não foi encontrada. Execute as migrations no Supabase.";
  if (details) return details;
  if (message && message !== "Bad Request") return message;
  return "O servidor recusou a jogada. O estado oficial foi atualizado.";
}

export function OnlineGame({ gameId }: { gameId: string }): React.ReactElement {
  const [game, setGame] = useState<OnlineGameRecord | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("Carregando estado oficial da partida…");
  const [connected, setConnected] = useState(true);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const moveInFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    const { data, error } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
    if (error || !data) { setMessage("Partida não encontrada ou sem autorização para acessá-la."); return; }
    setGame(data as unknown as OnlineGameRecord);
    setMessage("");
  }, [gameId]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    let current = true;
    const start = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!current || !user) { setMessage("Entre na sua conta para acessar esta partida."); return; }
      setUserId(user.id);
      await refresh();
      if (!current) return;
      const channel = supabase.channel(`game:${gameId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, () => { void refresh(); }).subscribe((status: string) => setConnected(status === "SUBSCRIBED"));
      const onOffline = () => setConnected(false);
      window.addEventListener("online", refresh);
      window.addEventListener("offline", onOffline);
      const heartbeat = window.setInterval(() => { void supabase.rpc("touch_game_connection", { p_game_id: gameId }); }, 15_000);
      return () => { window.clearInterval(heartbeat); window.removeEventListener("online", refresh); window.removeEventListener("offline", onOffline); void supabase.removeChannel(channel); };
    };
    let clean: (() => void) | undefined;
    void start().then((dispose) => { clean = dispose; });
    return () => { current = false; clean?.(); };
  }, [gameId, refresh]);

  const localPiece = useMemo<Player>(() => game?.black_player_id === userId ? 1 : 2, [game?.black_player_id, userId]);
  const lastMove = game && game.last_move_row !== null && game.last_move_col !== null ? { row: game.last_move_row, col: game.last_move_col } : null;
  const result = game ? toResult(game) : null;
  const play = async (row: number, col: number) => {
    if (!game || !connected || isSubmittingMove || moveInFlightRef.current) return;
    const input = moveInputSchema.safeParse({ gameId, row, col });
    if (!input.success) { setMessage("Jogada inválida."); return; }
    const supabase = createClient(); if (!supabase) return;
    moveInFlightRef.current = true;
    setIsSubmittingMove(true);
    try {
      const { error } = await supabase.rpc("submit_game_move", { p_game_id: input.data.gameId, p_row: input.data.row, p_col: input.data.col });
      if (error) {
        console.error("submit_game_move failed:", error);
        setMessage(moveErrorMessage(error.code, error.message, error.details ?? null));
        await refresh();
        return;
      }
      setMessage("");
      await refresh();
    } finally {
      moveInFlightRef.current = false;
      setIsSubmittingMove(false);
    }
  };
  const resign = async () => { if (!game || !window.confirm("Deseja desistir desta partida?")) return; const supabase = createClient(); if (!supabase) return; const { error } = await supabase.rpc("resign_game", { p_game_id: gameId }); if (error) setMessage("Não foi possível registrar a desistência."); await refresh(); };
  const rematch = async () => { const supabase = createClient(); if (!supabase) return; const { data, error } = await supabase.rpc("request_rematch", { p_game_id: gameId }); if (error) { setMessage("Não foi possível solicitar a revanche."); return; } if (data) { window.location.assign(`/partida/${data}`); return; } setMessage("Revanche solicitada. Aguardando o outro jogador."); };
  const cancelRoom = async () => { const supabase = createClient(); if (!supabase) return; await supabase.rpc("cancel_private_room", { p_game_id: gameId }); window.location.assign("/multiplayer"); };

  if (!isSupabaseConfigured()) return <section className="waiting-card"><h1>Configure o Supabase para abrir partidas online.</h1></section>;
  if (!game) return <section className="waiting-card"><h1>{message}</h1>{message.includes("autorização") ? <Link className="button primary" href="/entrar">Entrar</Link> : null}</section>;
  const isOwnTurn = game.status === "active" && game.current_player === localPiece;
  const outcome = result?.type === "draw" ? "Empate" : result?.winner === localPiece ? "Você venceu!" : "Adversário venceu";
  return <section className="page-shell game-page"><div className="game-layout" aria-live="polite"><div className="game-main"><div className="game-status-mobile"><span className={connected ? "status-dot" : "status-dot offline"} />{isSubmittingMove ? "Enviando jogada…" : statusText(game, localPiece, connected)}</div><GomokuBoard board={game.board} currentPlayer={game.current_player} disabled={!isOwnTurn || !connected || isSubmittingMove} lastMove={lastMove} winningLine={game.winning_line} onCellClick={play} /></div><aside className="game-sidebar"><p className="eyebrow">Multiplayer casual</p><h1>{game.status === "finished" ? outcome : "Partida online"}</h1><div className="player-card active-player"><span className="player-stone stone-1" /><div><strong>Jogador preto</strong><span>{game.black_player_id === userId ? "Você" : "Adversário"}</span></div></div><div className="versus">VS</div><div className="player-card"><span className="player-stone stone-2" /><div><strong>Jogador branco</strong><span>{game.white_player_id === userId ? "Você" : "Adversário"}</span></div></div><div className="status-card">{connected ? <Wifi size={16} /> : <WifiOff size={16} />} {isSubmittingMove ? "Enviando jogada…" : statusText(game, localPiece, connected)}</div><p className="move-count">{game.move_count} {game.move_count === 1 ? "jogada" : "jogadas"}</p>{game.status === "waiting" && game.room_code ? <RoomCode code={game.room_code} gameId={game.id} /> : null}{message ? <p className="form-message">{message}</p> : null}<div className="game-actions desktop-actions">{game.status === "active" ? <button className="button danger" onClick={resign}><Flag size={17} /> Desistir</button> : null}{game.status === "waiting" ? <button className="button secondary" onClick={cancelRoom}>Cancelar sala</button> : null}{game.status === "finished" ? <button className="button primary" onClick={rematch}><RefreshCw size={17} /> Pedir revanche</button> : null}</div></aside></div></section>;
}
