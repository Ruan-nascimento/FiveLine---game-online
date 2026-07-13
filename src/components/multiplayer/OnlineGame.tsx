"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flag, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { GomokuBoard } from "@/components/game/GomokuBoard";
import { TurnTimer } from "@/components/game/TurnTimer";
import { GameChat } from "@/components/multiplayer/GameChat";
import { OnlineGameResultModal } from "@/components/multiplayer/OnlineGameResultModal";
import { ResignConfirmDialog } from "@/components/multiplayer/ResignConfirmDialog";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { RoomCode } from "./PrivateRoom";
import { playSound } from "@/lib/audio/sounds";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { syncProfileAvatar } from "@/lib/supabase/avatar";
import { RESULT_MODAL_AUTO_CLOSE_MS } from "@/lib/constants/app";
import { moveInputSchema } from "@/lib/validations/game";
import type { GameResult, Player } from "@/features/game/types";
import type { OnlineGameRecord, PlayerProfile } from "@/features/multiplayer/types";

function playerNick(profile: PlayerProfile | undefined, fallback: string): string {
  return profile?.display_name?.trim() || profile?.username || fallback;
}

function statusText(game: OnlineGameRecord, localPiece: Player, connected: boolean, isOwnTurn: boolean): string {
  if (!connected) return "Reconectando…";
  if (game.status === "waiting") return "Aguardando adversário…";
  if (game.status === "finished") return "Partida concluída";
  return isOwnTurn ? "Seu turno" : "Turno do adversário";
}

function toResult(game: OnlineGameRecord): GameResult | null {
  if (game.status !== "finished") return null;
  if (game.result === "draw") return { type: "draw", winner: null };
  const type =
    game.result_reason === "resignation"
      ? "resignation"
      : game.result_reason === "disconnect" || game.result_reason === "turn_timeout"
        ? "disconnect"
        : "win";
  return { type, winner: game.result === "black_win" ? 1 : 2 };
}

function moveErrorMessage(code: string | undefined, message: string, details: string | null): string {
  if (message.includes("TURN_PASSED") || message.includes("TURN_TIMED_OUT")) {
    return "Tempo esgotado. A vez passou para o adversário.";
  }
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
  const router = useRouter();
  const [game, setGame] = useState<OnlineGameRecord | null>(null);
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("Carregando estado oficial da partida…");
  const [connected, setConnected] = useState(true);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [rematchPending, setRematchPending] = useState(false);
  const [opponentRematch, setOpponentRematch] = useState(false);
  const [autoCloseSeconds, setAutoCloseSeconds] = useState(RESULT_MODAL_AUTO_CLOSE_MS / 1000);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [resigning, setResigning] = useState(false);
  const moveInFlightRef = useRef(false);
  const exitedRef = useRef(false);
  const soundStateRef = useRef<{
    status: OnlineGameRecord["status"];
    moveCount: number;
    currentPlayer: Player;
    primed: boolean;
  } | null>(null);

  const loadProfiles = useCallback(async (record: OnlineGameRecord) => {
    const supabase = createClient();
    if (!supabase) return;
    const ids = [record.black_player_id, record.white_player_id].filter(Boolean) as string[];
    if (ids.length === 0) return;
    const { data } = await supabase.from("profiles").select("id, username, display_name, avatar_key").in("id", ids);
    if (!data) return;
    const map: Record<string, PlayerProfile> = {};
    for (const profile of data as PlayerProfile[]) map[profile.id] = profile;
    setProfiles(map);
  }, []);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    const { data, error } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
    if (error || !data) {
      setMessage("Partida não encontrada ou sem autorização para acessá-la.");
      return;
    }
    const record = data as unknown as OnlineGameRecord;
    setGame(record);
    setMessage("");
    await loadProfiles(record);
  }, [gameId, loadProfiles]);

  const refreshRematch = useCallback(async () => {
    const supabase = createClient();
    if (!supabase || !userId) return;
    const { data } = await supabase.from("rematch_requests").select("player_id").eq("game_id", gameId);
    const requests = (data ?? []) as { player_id: string }[];
    setRematchPending(requests.some((item) => item.player_id === userId));
    setOpponentRematch(requests.some((item) => item.player_id !== userId));
  }, [gameId, userId]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    let current = true;
    const start = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!current || !user) {
        setMessage("Entre na sua conta para acessar esta partida.");
        return;
      }
      setUserId(user.id);
      await syncProfileAvatar(supabase, user);
      await refresh();
      if (!current) return;

      const channel = supabase
        .channel(`game:${gameId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, () => { void refresh(); })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "rematch_requests", filter: `game_id=eq.${gameId}` }, () => { void refreshRematch(); })
        .subscribe((status: string) => setConnected(status === "SUBSCRIBED"));

      const onOffline = () => setConnected(false);
      window.addEventListener("online", refresh);
      window.addEventListener("offline", onOffline);
      const heartbeat = window.setInterval(() => { void supabase.rpc("touch_game_connection", { p_game_id: gameId }); }, 15_000);
      const timeoutCheck = window.setInterval(() => { void supabase.rpc("forfeit_timed_out_turn", { p_game_id: gameId }).then(() => refresh()); }, 1_000);

      return () => {
        window.clearInterval(heartbeat);
        window.clearInterval(timeoutCheck);
        window.removeEventListener("online", refresh);
        window.removeEventListener("offline", onOffline);
        void supabase.removeChannel(channel);
      };
    };
    let clean: (() => void) | undefined;
    void start().then((dispose) => { clean = dispose; });
    return () => { current = false; clean?.(); };
  }, [gameId, refresh, refreshRematch]);

  useEffect(() => {
    if (game?.status === "finished") {
      setShowResultModal(true);
      void refreshRematch();
    } else {
      setShowResultModal(false);
      setRematchPending(false);
      setOpponentRematch(false);
    }
  }, [game?.status, refreshRematch]);

  useEffect(() => {
    if (!game?.rematch_game_id || exitedRef.current) return;
    exitedRef.current = true;
    window.location.assign(`/partida/${game.rematch_game_id}`);
  }, [game?.rematch_game_id]);

  useEffect(() => {
    if (!game?.rematch_declined_at || exitedRef.current) return;
    exitedRef.current = true;
    router.push("/multiplayer");
  }, [game?.rematch_declined_at, router]);

  useEffect(() => {
    if (!showResultModal || game?.status !== "finished") return;
    if (game.rematch_game_id || game.rematch_declined_at) return;

    const startedAt = Date.now();
    setAutoCloseSeconds(RESULT_MODAL_AUTO_CLOSE_MS / 1000);

    const interval = window.setInterval(() => {
      const remainingMs = RESULT_MODAL_AUTO_CLOSE_MS - (Date.now() - startedAt);
      setAutoCloseSeconds(Math.max(0, Math.ceil(remainingMs / 1000)));
    }, 250);

    const timeout = window.setTimeout(() => {
      if (exitedRef.current) return;
      const supabase = createClient();
      if (supabase) {
        void supabase.rpc("decline_rematch", { p_game_id: gameId }).finally(() => {
          if (!exitedRef.current) {
            exitedRef.current = true;
            router.push("/multiplayer");
          }
        });
        return;
      }
      exitedRef.current = true;
      router.push("/multiplayer");
    }, RESULT_MODAL_AUTO_CLOSE_MS);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [showResultModal, game?.status, game?.id, game?.rematch_game_id, game?.rematch_declined_at, gameId, router]);

  const localPiece = useMemo<Player>(() => (game?.black_player_id === userId ? 1 : 2), [game?.black_player_id, userId]);
  const lastMove = game && game.last_move_row !== null && game.last_move_col !== null ? { row: game.last_move_row, col: game.last_move_col } : null;
  const result = game ? toResult(game) : null;
  const isOwnTurn = game?.status === "active" && game.current_player === localPiece;

  useEffect(() => {
    if (!game || !userId) return;
    const prev = soundStateRef.current;
    const snapshot = {
      status: game.status,
      moveCount: game.move_count,
      currentPlayer: game.current_player,
      primed: true,
    };
    const move =
      game.last_move_row !== null && game.last_move_col !== null
        ? { row: game.last_move_row, col: game.last_move_col }
        : null;

    if (!prev) {
      soundStateRef.current = snapshot;
      if (game.status === "active" && game.move_count === 0) playSound("gameStart");
      return;
    }

    if (prev.status === "waiting" && game.status === "active") {
      playSound("gameStart");
    }

    if (game.status === "active" || game.status === "finished") {
      if (game.move_count > prev.moveCount && move) {
        const placed = game.board[move.row]?.[move.col] ?? 0;
        if (placed === localPiece) {
          playSound("place");
        } else if (placed !== 0) {
          playSound("opponentPlace");
          if (game.status === "active" && game.current_player === localPiece) {
            window.setTimeout(() => playSound("yourTurn"), 140);
          }
        }
      } else if (
        game.status === "active" &&
        game.move_count === prev.moveCount &&
        game.current_player !== prev.currentPlayer
      ) {
        if (game.current_player === localPiece) playSound("yourTurn");
        else playSound("turnPassed");
      }
    }

    if (prev.status !== "finished" && game.status === "finished") {
      const finished = toResult(game);
      if (finished?.type === "draw") playSound("lose");
      else if (finished?.winner === localPiece) playSound("win");
      else playSound("lose");
    }

    soundStateRef.current = snapshot;
  }, [game, userId, localPiece]);

  useEffect(() => {
    if (!isOwnTurn || game?.status !== "active") setShowResignDialog(false);
  }, [isOwnTurn, game?.status]);

  const blackNick = playerNick(profiles[game?.black_player_id ?? ""], "Jogador preto");
  const whiteNick = playerNick(profiles[game?.white_player_id ?? ""], "Jogador branco");
  const localNick = localPiece === 1 ? blackNick : whiteNick;
  const opponentNick = localPiece === 1 ? whiteNick : blackNick;
  const blackAvatar = profiles[game?.black_player_id ?? ""]?.avatar_key ?? null;
  const whiteAvatar = profiles[game?.white_player_id ?? ""]?.avatar_key ?? null;

  const usernameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (game?.black_player_id) map[game.black_player_id] = blackNick;
    if (game?.white_player_id) map[game.white_player_id] = whiteNick;
    return map;
  }, [game?.black_player_id, game?.white_player_id, blackNick, whiteNick]);

  const avatarMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    if (game?.black_player_id) map[game.black_player_id] = blackAvatar;
    if (game?.white_player_id) map[game.white_player_id] = whiteAvatar;
    return map;
  }, [game?.black_player_id, game?.white_player_id, blackAvatar, whiteAvatar]);

  const play = async (row: number, col: number) => {
    if (!game || !connected || isSubmittingMove || moveInFlightRef.current || !isOwnTurn) return;
    const input = moveInputSchema.safeParse({ gameId, row, col });
    if (!input.success) { setMessage("Jogada inválida."); return; }
    const supabase = createClient();
    if (!supabase) return;
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

  const openResignDialog = () => {
    if (!game || game.status !== "active" || !isOwnTurn || !connected) {
      setMessage("Você só pode desistir na sua vez de jogar.");
      return;
    }
    setShowResignDialog(true);
  };

  const confirmResign = async () => {
    if (!game || !isOwnTurn || resigning) return;
    const supabase = createClient();
    if (!supabase) return;
    setResigning(true);
    const { error } = await supabase.rpc("resign_game", { p_game_id: gameId });
    setResigning(false);
    setShowResignDialog(false);
    if (error) {
      if (error.message.includes("NOT_YOUR_TURN")) {
        setMessage("Você só pode desistir na sua vez de jogar.");
      } else {
        setMessage("Não foi possível registrar a desistência.");
      }
    }
    await refresh();
  };

  const rematch = async () => {
    const supabase = createClient();
    if (!supabase) return;
    const { data, error } = await supabase.rpc("request_rematch", { p_game_id: gameId });
    if (error) {
      const text = error.message ?? "";
      if (text.includes("REMATCH_EXPIRED")) {
        setMessage("O tempo para pedir revanche acabou.");
        exitedRef.current = true;
        router.push("/multiplayer");
        return;
      }
      if (text.includes("REMATCH_DECLINED")) {
        exitedRef.current = true;
        router.push("/multiplayer");
        return;
      }
      setMessage("Não foi possível solicitar a revanche.");
      return;
    }
    if (data) {
      exitedRef.current = true;
      window.location.assign(`/partida/${data}`);
      return;
    }
    setRematchPending(true);
    setMessage("Revanche solicitada. Aguardando o outro jogador.");
    await refreshRematch();
  };

  const exitToLobby = async () => {
    if (exitedRef.current) return;
    const supabase = createClient();
    if (supabase) {
      await supabase.rpc("decline_rematch", { p_game_id: gameId });
      const { data } = await supabase
        .from("games")
        .select("rematch_game_id")
        .eq("id", gameId)
        .maybeSingle();
      const nextGameId = (data as { rematch_game_id: string | null } | null)?.rematch_game_id;
      if (nextGameId) {
        exitedRef.current = true;
        window.location.assign(`/partida/${nextGameId}`);
        return;
      }
    }
    exitedRef.current = true;
    router.push("/multiplayer");
  };

  const cancelRoom = async () => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.rpc("cancel_private_room", { p_game_id: gameId });
    router.push("/multiplayer");
  };

  if (!isSupabaseConfigured()) {
    return <section className="waiting-card"><h1>Configure o Supabase para abrir partidas online.</h1></section>;
  }
  if (!game) {
    return (
      <section className="waiting-card">
        <h1>{message}</h1>
        {message.includes("conta") ? <Link className="button primary" href="/entrar">Entrar com Google</Link> : null}
      </section>
    );
  }

  const winnerNick = result?.type === "draw" ? blackNick : result?.winner === 1 ? blackNick : whiteNick;
  const loserNick = result?.type === "draw" ? whiteNick : result?.winner === 1 ? whiteNick : blackNick;
  const won = result?.winner === localPiece;

  return (
    <section className="page-shell game-page">
      <div className="game-layout online-game-layout" aria-live="polite">
        <div className="game-main">
          <div className="game-status-mobile">
            <span className={connected ? "status-dot" : "status-dot offline"} />
            {isSubmittingMove ? "Enviando jogada…" : statusText(game, localPiece, connected, isOwnTurn)}
          </div>
          <GomokuBoard
            board={game.board}
            currentPlayer={game.current_player}
            disabled={!isOwnTurn || !connected || isSubmittingMove}
            lastMove={lastMove}
            winningLine={game.winning_line}
            onCellClick={play}
          />
          {game.status === "active" ? (
            <div className="game-actions mobile-actions">
              <button
                className="button danger"
                onClick={openResignDialog}
                disabled={!isOwnTurn || !connected || resigning}
                title={isOwnTurn ? "Desistir da partida" : "Só é possível desistir na sua vez"}
              >
                <Flag size={17} /> Desistir
              </button>
            </div>
          ) : null}
        </div>

        <aside className="game-sidebar">
          <p className="eyebrow">Multiplayer casual</p>
          <h1>{game.status === "finished" ? "Partida encerrada" : `${localNick} vs ${opponentNick}`}</h1>

          <div className={`player-card ${game.current_player === 1 ? "active-player" : ""}`}>
            <span className="player-stone stone-1" />
            <PlayerAvatar src={blackAvatar} name={blackNick} size={32} />
            <div>
              <strong>{blackNick}</strong>
              <span>{game.black_player_id === userId ? "Você · peças pretas" : "Adversário · peças pretas"}</span>
            </div>
          </div>
          <div className="versus">VS</div>
          <div className={`player-card ${game.current_player === 2 ? "active-player" : ""}`}>
            <span className="player-stone stone-2" />
            <PlayerAvatar src={whiteAvatar} name={whiteNick} size={32} />
            <div>
              <strong>{whiteNick}</strong>
              <span>{game.white_player_id === userId ? "Você · peças brancas" : "Adversário · peças brancas"}</span>
            </div>
          </div>

          <div className="status-card">
            {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isSubmittingMove ? "Enviando jogada…" : statusText(game, localPiece, connected, isOwnTurn)}
          </div>

          <TurnTimer deadline={game.turn_deadline_at} active={game.status === "active"} />
          <p className="move-count">{game.move_count} {game.move_count === 1 ? "jogada" : "jogadas"}</p>

          {game.status === "waiting" && game.room_code ? <RoomCode code={game.room_code} gameId={game.id} /> : null}
          {message ? <p className="form-message">{message}</p> : null}

          <div className="game-actions desktop-actions">
            {game.status === "active" ? (
              <button
                className="button danger"
                onClick={openResignDialog}
                disabled={!isOwnTurn || !connected || resigning}
                title={isOwnTurn ? "Desistir da partida" : "Só é possível desistir na sua vez"}
              >
                <Flag size={17} /> Desistir
              </button>
            ) : null}
            {game.status === "waiting" ? (
              <button className="button secondary" onClick={cancelRoom}>Cancelar sala</button>
            ) : null}
          </div>

          <GameChat
            gameId={gameId}
            userId={userId ?? ""}
            usernames={usernameMap}
            avatars={avatarMap}
            enabled={(game.status === "waiting" || game.status === "active") && Boolean(userId)}
          />
        </aside>
      </div>

      {showResignDialog ? (
        <ResignConfirmDialog
          open={showResignDialog}
          pending={resigning}
          onConfirm={confirmResign}
          onCancel={() => setShowResignDialog(false)}
        />
      ) : null}

      {showResultModal && result ? (
        <OnlineGameResultModal
          winnerName={winnerNick}
          loserName={loserNick}
          isWinner={won}
          isDraw={result.type === "draw"}
          board={game.board}
          winningLine={game.winning_line}
          lastMove={lastMove}
          resultReason={game.result_reason}
          rematchPending={rematchPending}
          opponentRematch={opponentRematch}
          autoCloseSeconds={autoCloseSeconds}
          onRematch={rematch}
          onExit={exitToLobby}
        />
      ) : null}
    </section>
  );
}
