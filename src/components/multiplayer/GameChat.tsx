"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ChevronDown, MessageCircle, Send } from "lucide-react";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { playSound } from "@/lib/audio/sounds";
import { createClient } from "@/lib/supabase/client";
import type { GameMessage } from "@/features/multiplayer/types";

const NEAR_BOTTOM_PX = 56;

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function GameChat({
  gameId,
  userId,
  usernames,
  avatars,
  enabled,
}: {
  gameId: string;
  userId: string;
  usernames: Record<string, string>;
  avatars: Record<string, string | null>;
  enabled: boolean;
}): React.ReactElement {
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const hydratedRef = useRef(false);

  useEffect(() => {
    pinnedRef.current = pinnedToBottom;
  }, [pinnedToBottom]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    let current = true;
    hydratedRef.current = false;
    seenIdsRef.current = new Set();

    const load = async () => {
      const { data, error: loadError } = await supabase
        .from("game_messages")
        .select("id, game_id, sender_id, body, created_at")
        .eq("game_id", gameId)
        .order("created_at", { ascending: true });
      if (!current) return;
      if (loadError) {
        setError("Não foi possível carregar o chat.");
        return;
      }
      const rows = (data as GameMessage[]) ?? [];
      for (const row of rows) seenIdsRef.current.add(row.id);
      setMessages(rows);
      setUnseenCount(0);
      setPinnedToBottom(true);
      hydratedRef.current = true;
    };

    void load();

    const channel = supabase
      .channel(`chat:${gameId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_messages", filter: `game_id=eq.${gameId}` },
        (payload: { new: GameMessage }) => {
          const row = payload.new;
          if (seenIdsRef.current.has(row.id)) return;
          seenIdsRef.current.add(row.id);
          setMessages((prev) => (prev.some((item) => item.id === row.id) ? prev : [...prev, row]));
          if (hydratedRef.current) {
            playSound(row.sender_id === userId ? "chatOut" : "chatIn");
          }
          if (!pinnedRef.current && row.sender_id !== userId) {
            setUnseenCount((count) => count + 1);
          }
        },
      )
      .subscribe();

    return () => {
      current = false;
      void supabase.removeChannel(channel);
    };
  }, [gameId, userId]);

  useEffect(() => {
    if (!pinnedToBottom) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pinnedToBottom]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distance <= NEAR_BOTTOM_PX;
    setPinnedToBottom(nearBottom);
    if (nearBottom) setUnseenCount(0);
  };

  const jumpToLatest = () => {
    setPinnedToBottom(true);
    setUnseenCount(0);
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !enabled || pending) return;
    const supabase = createClient();
    if (!supabase) return;
    setPending(true);
    setError(null);
    setPinnedToBottom(true);
    setUnseenCount(0);
    const { error: sendError } = await supabase.rpc("send_game_message", { p_game_id: gameId, p_body: body });
    if (sendError) {
      setError("Não foi possível enviar a mensagem.");
    } else {
      setDraft("");
    }
    setPending(false);
  };

  return (
    <section className="game-chat" aria-label="Chat da partida">
      <div className="game-chat-header">
        <div className="game-chat-title">
          <MessageCircle size={16} aria-hidden />
          <strong>Chat</strong>
        </div>
        <span className="muted">{messages.length} {messages.length === 1 ? "mensagem" : "mensagens"}</span>
      </div>

      <div className="game-chat-panel">
        <div className="game-chat-messages" ref={listRef} onScroll={onScroll} role="log" aria-live="polite">
          {messages.length === 0 ? (
            <p className="muted game-chat-empty">Nenhuma mensagem ainda. Diga olá!</p>
          ) : (
            messages.map((message) => {
              const own = message.sender_id === userId;
              const nick = usernames[message.sender_id] ?? "Jogador";
              const avatar = avatars[message.sender_id] ?? null;
              return (
                <article
                  key={message.id}
                  className={`game-chat-bubble ${own ? "own" : "theirs"}`}
                  title={`${own ? "Você" : nick} · ${new Date(message.created_at).toLocaleString("pt-BR")}`}
                >
                  <header>
                    <span className="game-chat-author">
                      <PlayerAvatar src={avatar} name={own ? "Você" : nick} size={20} />
                      <strong>{own ? "Você" : nick}</strong>
                    </span>
                    <time dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
                  </header>
                  <p>{message.body}</p>
                </article>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {!pinnedToBottom ? (
          <button type="button" className="game-chat-jump" onClick={jumpToLatest}>
            <ChevronDown size={14} aria-hidden />
            {unseenCount > 0 ? `${unseenCount} nova${unseenCount === 1 ? "" : "s"}` : "Ir para o fim"}
          </button>
        ) : null}
      </div>

      {error ? <p className="form-message game-chat-error">{error}</p> : null}

      <form className="game-chat-form" onSubmit={send}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={enabled ? "Escreva uma mensagem…" : "Chat indisponível"}
          maxLength={280}
          disabled={!enabled || pending}
          aria-label="Mensagem do chat"
        />
        <button
          type="submit"
          className="button secondary game-chat-send"
          disabled={!enabled || pending || !draft.trim()}
          aria-label="Enviar mensagem"
        >
          <Send size={16} />
        </button>
      </form>
    </section>
  );
}
