"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, DoorOpen, Globe2, KeyRound, Lock, RefreshCw, Users } from "lucide-react";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { createClient } from "@/lib/supabase/client";

export type LobbyTab = "join" | "create";
export type RoomListFilter = "public" | "private";

export interface OpenRoom {
  id: string;
  is_public: boolean;
  created_at: string;
  room_code: string | null;
  host_id: string | null;
  host_name: string;
  host_username: string | null;
  host_avatar: string | null;
}

function mapRpcError(message: string | undefined): string {
  const text = message ?? "";
  if (text.includes("ACTIVE_GAME_EXISTS")) return "Você já está em uma partida ativa.";
  if (text.includes("CANNOT_JOIN_OWN_ROOM")) return "Você não pode entrar na sua própria sala.";
  if (text.includes("ROOM_NOT_AVAILABLE")) return "Sala não encontrada, indisponível ou já iniciada.";
  return "Não foi possível concluir a ação. Tente novamente.";
}

export function RoomLobby({ initialTab = "join" }: { initialTab?: LobbyTab }): React.ReactElement {
  const router = useRouter();
  const search = useSearchParams();
  const [tab, setTab] = useState<LobbyTab>(initialTab);
  const [listFilter, setListFilter] = useState<RoomListFilter>("public");
  const [isPublic, setIsPublic] = useState(true);
  const [rooms, setRooms] = useState<OpenRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [codeFocus, setCodeFocus] = useState(search.get("codigo") ?? "");

  const loadRooms = async () => {
    const supabase = createClient();
    if (!supabase) {
      setLoadingRooms(false);
      setError("Configure o Supabase para ver as salas.");
      return;
    }
    setLoadingRooms(true);
    const { data, error: rpcError } = await supabase.rpc("list_open_rooms", { p_limit: 50 });
    setLoadingRooms(false);
    if (rpcError) {
      setError("Não foi possível carregar a lista de salas.");
      setRooms([]);
      return;
    }
    const parsed = typeof data === "string" ? (JSON.parse(data) as OpenRoom[]) : ((data as OpenRoom[] | null) ?? []);
    setRooms(Array.isArray(parsed) ? parsed : []);
    setError(null);
  };

  useEffect(() => {
    void loadRooms();
    const timer = window.setInterval(() => void loadRooms(), 12000);
    return () => window.clearInterval(timer);
  }, []);

  const create = async () => {
    const supabase = createClient();
    if (!supabase) {
      setError("Configure o Supabase para criar uma sala.");
      return;
    }
    setPending(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("create_private_room", { p_is_public: isPublic });
    setPending(false);
    if (rpcError || !data) {
      setError(mapRpcError(rpcError?.message));
      return;
    }
    router.push(`/partida/${data}`);
  };

  const joinByCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = codeFocus.trim().toUpperCase();
    if (!code) return;
    const supabase = createClient();
    if (!supabase) {
      setError("Configure o Supabase para entrar em uma sala.");
      return;
    }
    setPending(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("join_private_room", { p_room_code: code });
    setPending(false);
    if (rpcError || !data) {
      setError(mapRpcError(rpcError?.message));
      return;
    }
    router.push(`/partida/${data}`);
  };

  const joinPublic = async (roomId: string) => {
    const supabase = createClient();
    if (!supabase) {
      setError("Configure o Supabase para entrar em uma sala.");
      return;
    }
    setJoiningId(roomId);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("join_public_room", { p_game_id: roomId });
    setJoiningId(null);
    if (rpcError || !data) {
      setError(mapRpcError(rpcError?.message));
      void loadRooms();
      return;
    }
    router.push(`/partida/${data}`);
  };

  const publicRooms = rooms.filter((room) => room.is_public);
  const privateRooms = rooms.filter((room) => !room.is_public);
  const visibleRooms = listFilter === "public" ? publicRooms : privateRooms;

  return (
    <section className="room-lobby">
      <header className="room-lobby-header">
        <p className="eyebrow">Multijogador</p>
        <h1>Salas online</h1>
        <p className="muted">Crie uma sala ou entre em uma partida aberta. Públicas são de um clique; privadas pedem o código.</p>
      </header>

      <div className="lobby-tabs" role="tablist" aria-label="Criar ou entrar">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "join"}
          className={`lobby-tab ${tab === "join" ? "active" : ""}`}
          onClick={() => { setTab("join"); setError(null); }}
        >
          <DoorOpen size={16} /> Entrar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "create"}
          className={`lobby-tab ${tab === "create" ? "active" : ""}`}
          onClick={() => { setTab("create"); setError(null); }}
        >
          <KeyRound size={16} /> Criar sala
        </button>
      </div>

      {error ? <p className="form-message lobby-error">{error}</p> : null}

      {tab === "create" ? (
        <div className="lobby-panel" role="tabpanel">
          <div className="visibility-picker">
            <button
              type="button"
              className={`visibility-option ${isPublic ? "active" : ""}`}
              onClick={() => setIsPublic(true)}
            >
              <Globe2 size={22} />
              <strong>Pública</strong>
              <span>Aparece na lista. Qualquer pessoa pode entrar com um clique.</span>
            </button>
            <button
              type="button"
              className={`visibility-option ${!isPublic ? "active" : ""}`}
              onClick={() => setIsPublic(false)}
            >
              <Lock size={22} />
              <strong>Privada</strong>
              <span>Aparece na lista, mas só entra quem tiver o código da sala.</span>
            </button>
          </div>
          <button className="button primary large" disabled={pending} onClick={create}>
            {pending ? "Criando…" : isPublic ? "Criar sala pública" : "Criar sala privada"}
          </button>
        </div>
      ) : (
        <div className="lobby-panel" role="tabpanel">
          <form className="code-join-form" onSubmit={joinByCode}>
            <label>
              Código da sala
              <input
                id="room-code-input"
                value={codeFocus}
                onChange={(event) => setCodeFocus(event.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ABC123"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <button className="button primary" disabled={pending || codeFocus.trim().length < 4}>
              {pending ? "Entrando…" : "Entrar com código"}
            </button>
          </form>

          <div className="room-list-toolbar">
            <div className="room-filter-tabs" role="tablist" aria-label="Tipo de sala">
              <button
                type="button"
                className={`room-filter-tab ${listFilter === "public" ? "active" : ""}`}
                onClick={() => setListFilter("public")}
              >
                <Globe2 size={14} /> Públicas ({publicRooms.length})
              </button>
              <button
                type="button"
                className={`room-filter-tab ${listFilter === "private" ? "active" : ""}`}
                onClick={() => setListFilter("private")}
              >
                <Lock size={14} /> Privadas ({privateRooms.length})
              </button>
            </div>
            <button type="button" className="button secondary room-refresh" onClick={() => void loadRooms()} disabled={loadingRooms}>
              <RefreshCw size={14} className={loadingRooms ? "spin" : undefined} /> Atualizar
            </button>
          </div>

          {loadingRooms && rooms.length === 0 ? (
            <p className="muted room-list-empty">Carregando salas…</p>
          ) : visibleRooms.length === 0 ? (
            <div className="room-list-empty">
              <Users size={28} />
              <p>
                {listFilter === "public"
                  ? "Nenhuma sala pública aberta no momento."
                  : "Nenhuma sala privada listada agora."}
              </p>
              <button type="button" className="text-link" onClick={() => setTab("create")}>
                Criar uma sala →
              </button>
            </div>
          ) : (
            <ul className="room-list">
              {visibleRooms.map((room) => (
                <li key={room.id} className={`room-list-item ${room.is_public ? "is-public" : "is-private"}`}>
                  <div className="room-list-host">
                    <PlayerAvatar src={room.host_avatar} name={room.host_name} size={40} />
                    <div>
                      <strong>{room.host_name}</strong>
                      <small>@{room.host_username ?? "jogador"} · aguardando</small>
                    </div>
                  </div>
                  <div className="room-list-meta">
                    <span className={`room-badge ${room.is_public ? "public" : "private"}`}>
                      {room.is_public ? "Pública" : "Privada"}
                    </span>
                    <time>
                      {new Date(room.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </div>
                  {room.is_public ? (
                    <button
                      type="button"
                      className="button primary"
                      disabled={joiningId === room.id}
                      onClick={() => void joinPublic(room.id)}
                    >
                      {joiningId === room.id ? "Entrando…" : "Entrar"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => {
                        setError("Esta sala é privada. Digite o código acima para entrar.");
                        const input = document.getElementById("room-code-input") as HTMLInputElement | null;
                        input?.focus();
                        input?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                    >
                      Precisa do código
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export function CreatePrivateRoom(): React.ReactElement {
  return <RoomLobby initialTab="create" />;
}

export function JoinPrivateRoom(): React.ReactElement {
  return <RoomLobby initialTab="join" />;
}

export function RoomCode({
  code,
  gameId,
  isPublic = false,
}: {
  code: string;
  gameId: string;
  isPublic?: boolean;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/multiplayer/entrar?codigo=${code}`);
    setCopied(true);
  };
  return (
    <div className="room-code">
      <span>{isPublic ? "Sala pública" : "Sala privada"} · seu código</span>
      <strong>{code}</strong>
      <button className="button secondary" onClick={copy}>
        <Copy size={16} /> {copied ? "Copiado" : "Copiar link"}
      </button>
      <small>ID da partida: {gameId.slice(0, 8)}</small>
    </div>
  );
}
