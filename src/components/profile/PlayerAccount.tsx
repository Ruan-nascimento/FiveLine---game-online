"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Save, Settings } from "lucide-react";
import { GameHistoryList, resultFor } from "@/components/profile/GameHistoryList";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { OnlineGameRecord, PlayerProfile } from "@/features/multiplayer/types";

interface AccountData {
  username: string;
  displayName: string;
  email: string;
  createdAt: string;
  avatar: string | null;
  games: OnlineGameRecord[];
  profiles: Record<string, PlayerProfile>;
  userId: string;
}

async function loadGamesWithProfiles(
  supabase: NonNullable<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ games: OnlineGameRecord[]; profiles: Record<string, PlayerProfile> }> {
  const { data: games, error } = await supabase
    .from("games")
    .select("*")
    .or(`black_player_id.eq.${userId},white_player_id.eq.${userId}`)
    .eq("status", "finished")
    .order("finished_at", { ascending: false })
    .limit(40);

  if (error || !games) return { games: [], profiles: {} };

  const typedGames = games as unknown as OnlineGameRecord[];
  const ids = new Set<string>();
  for (const game of typedGames) {
    if (game.black_player_id) ids.add(game.black_player_id);
    if (game.white_player_id) ids.add(game.white_player_id);
  }

  const profiles: Record<string, PlayerProfile> = {};
  if (ids.size > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_key")
      .in("id", [...ids]);
    for (const profile of (data ?? []) as PlayerProfile[]) profiles[profile.id] = profile;
  }

  return { games: typedGames, profiles };
}

export function PlayerAccount({
  historyOnly = false,
  profileUsername,
}: {
  historyOnly?: boolean;
  /** When set, shows another player's public profile (read-only). */
  profileUsername?: string;
}): React.ReactElement {
  const isPublic = Boolean(profileUsername);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("Carregando…");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage("Entre na sua conta para acessar esta página.");
        return;
      }
      setViewerId(user.id);

      if (profileUsername) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_key, created_at")
          .eq("username", profileUsername.toLowerCase())
          .maybeSingle();
        if (error || !profile) {
          setMessage("Jogador não encontrado.");
          return;
        }
        const typed = profile as PlayerProfile & { created_at: string };
        const { games, profiles } = await loadGamesWithProfiles(supabase, typed.id);
        setAccount({
          username: typed.username,
          displayName: typed.display_name?.trim() || typed.username,
          email: "",
          createdAt: typed.created_at,
          avatar: typed.avatar_key,
          games,
          profiles,
          userId: typed.id,
        });
        setMessage("");
        return;
      }

      const [{ data: profile }, history] = await Promise.all([
        supabase.from("profiles").select("username, display_name, created_at, avatar_key").eq("id", user.id).single(),
        loadGamesWithProfiles(supabase, user.id),
      ]);
      const typedProfile = profile as {
        username: string;
        display_name: string | null;
        created_at: string;
        avatar_key: string | null;
      } | null;
      const nick = typedProfile?.display_name ?? typedProfile?.username ?? "Jogador";
      setAccount({
        username: typedProfile?.username ?? "jogador",
        displayName: nick,
        email: user.email ?? "Conta Google",
        createdAt: typedProfile?.created_at ?? user.created_at,
        avatar: typedProfile?.avatar_key ?? null,
        games: history.games,
        profiles: history.profiles,
        userId: user.id,
      });
      setDisplayName(typedProfile?.display_name ?? typedProfile?.username ?? "");
      setMessage("");
    };
    void load();
  }, [profileUsername]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase || !account || isPublic) return;
    setSaving(true);
    setSaveMessage(null);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || account.username })
      .eq("id", account.userId);
    if (error) {
      setSaveMessage("Não foi possível salvar as alterações.");
    } else {
      setSaveMessage("Perfil atualizado com sucesso.");
      setAccount({ ...account, displayName: displayName.trim() || account.username });
    }
    setSaving(false);
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase?.auth.signOut();
    window.location.assign("/");
  };

  if (!isSupabaseConfigured()) {
    return <section className="waiting-card"><h1>Configure o Supabase para acessar perfil e histórico.</h1></section>;
  }
  if (!account) {
    return (
      <section className="waiting-card">
        <h1>{message}</h1>
        {message.startsWith("Entre") ? <Link className="button primary" href="/entrar">Entrar com Google</Link> : null}
      </section>
    );
  }

  const subjectId = account.userId;
  const wins = account.games.filter((game) => resultFor(game, subjectId) === "Vitória").length;
  const losses = account.games.filter((game) => resultFor(game, subjectId) === "Derrota").length;
  const draws = account.games.length - wins - losses;
  const isOwnProfile = viewerId === account.userId;

  return (
    <section className="page-shell">
      <div className="profile-header">
        <div className="profile-identity">
          <PlayerAvatar src={account.avatar} name={account.displayName} size={64} />
          <div>
            <p className="eyebrow">
              {historyOnly ? "Histórico de partidas" : isPublic ? "Perfil do jogador" : "Seu perfil"}
            </p>
            <h1>{historyOnly && isOwnProfile ? "Seu histórico" : account.displayName}</h1>
            <p className="muted">
              @{account.username}
              {!historyOnly ? ` · Conta criada em ${new Date(account.createdAt).toLocaleDateString("pt-BR")}` : null}
            </p>
          </div>
        </div>
        <div className="action-row">
          {!historyOnly && isOwnProfile ? (
            <button className="button secondary" onClick={() => setShowSettings((value) => !value)}>
              <Settings size={16} /> {showSettings ? "Fechar painel" : "Configurações"}
            </button>
          ) : null}
          {isOwnProfile ? (
            <button className="button secondary" onClick={logout}><LogOut size={16} /> Sair</button>
          ) : (
            <Link className="button secondary" href="/historico">Voltar ao histórico</Link>
          )}
        </div>
      </div>

      {!historyOnly && isOwnProfile && showSettings ? (
        <section className="profile-settings">
          <h2>Configurações da conta</h2>
          <form className="form-stack" onSubmit={saveProfile}>
            <label>
              Apelido exibido nas partidas
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={32} placeholder={account.username} />
            </label>
            <label>
              Identificador da conta
              <input value={`@${account.username}`} disabled />
            </label>
            <label>
              E-mail vinculado
              <input value={account.email} disabled />
            </label>
            <p className="muted settings-note">
              O login é feito exclusivamente com Google. E-mail e senha são gerenciados pela sua conta Google.
            </p>
            {saveMessage ? <p className={`form-message ${saveMessage.includes("sucesso") ? "form-success" : ""}`}>{saveMessage}</p> : null}
            <button className="button primary" disabled={saving}><Save size={16} /> {saving ? "Salvando…" : "Salvar alterações"}</button>
          </form>
        </section>
      ) : null}

      <div className="stats-grid">
        <article><strong>{account.games.length}</strong><span>Partidas</span></article>
        <article><strong className="stat-win">{wins}</strong><span>Vitórias</span></article>
        <article><strong className="stat-loss">{losses}</strong><span>Derrotas</span></article>
        <article><strong>{draws}</strong><span>Empates</span></article>
      </div>

      <h2 className="history-heading">{isOwnProfile ? "Partidas recentes" : `Histórico de ${account.displayName}`}</h2>
      <GameHistoryList games={account.games} viewerId={subjectId} profiles={account.profiles} />
    </section>
  );
}
