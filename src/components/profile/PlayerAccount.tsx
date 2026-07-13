"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Save, Settings } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { OnlineGameRecord } from "@/features/multiplayer/types";

interface AccountData {
  username: string;
  displayName: string;
  email: string;
  createdAt: string;
  games: OnlineGameRecord[];
  userId: string;
}

function resultFor(game: OnlineGameRecord, userId: string): "Vitória" | "Derrota" | "Empate" {
  if (game.result === "draw") return "Empate";
  return game.winner_player_id === userId ? "Vitória" : "Derrota";
}

export function PlayerAccount({ historyOnly = false }: { historyOnly?: boolean }): React.ReactElement {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("Carregando seu perfil…");
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
      const [{ data: profile }, { data: games, error }] = await Promise.all([
        supabase.from("profiles").select("username, display_name, created_at").eq("id", user.id).single(),
        supabase.from("games").select("*").or(`black_player_id.eq.${user.id},white_player_id.eq.${user.id}`).eq("status", "finished").order("finished_at", { ascending: false }).limit(30),
      ]);
      if (error) {
        setMessage("Não foi possível carregar o histórico.");
        return;
      }
      const typedProfile = profile as { username: string; display_name: string | null; created_at: string } | null;
      const nick = typedProfile?.display_name ?? typedProfile?.username ?? "Jogador";
      setAccount({
        username: typedProfile?.username ?? "jogador",
        displayName: nick,
        email: user.email ?? "Conta Google",
        createdAt: typedProfile?.created_at ?? user.created_at,
        games: (games ?? []) as unknown as OnlineGameRecord[],
        userId: user.id,
      });
      setDisplayName(typedProfile?.display_name ?? typedProfile?.username ?? "");
      setMessage("");
    };
    void load();
  }, []);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase || !account) return;
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

  const wins = account.games.filter((game) => resultFor(game, account.userId) === "Vitória").length;
  const losses = account.games.filter((game) => resultFor(game, account.userId) === "Derrota").length;
  const draws = account.games.length - wins - losses;

  return (
    <section className="page-shell">
      <div className="profile-header">
        <div>
          <p className="eyebrow">{historyOnly ? "Histórico de partidas" : "Seu perfil"}</p>
          <h1>{historyOnly ? "Suas partidas" : `Olá, ${account.displayName}`}</h1>
          {!historyOnly ? (
            <p className="muted">
              @{account.username} · Conta criada em {new Date(account.createdAt).toLocaleDateString("pt-BR")}
            </p>
          ) : null}
        </div>
        <div className="action-row">
          {!historyOnly ? (
            <button className="button secondary" onClick={() => setShowSettings((value) => !value)}>
              <Settings size={16} /> {showSettings ? "Fechar painel" : "Configurações"}
            </button>
          ) : null}
          <button className="button secondary" onClick={logout}><LogOut size={16} /> Sair</button>
        </div>
      </div>

      {!historyOnly && showSettings ? (
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

      {!historyOnly ? (
        <div className="stats-grid">
          <article><strong>{account.games.length}</strong><span>Partidas</span></article>
          <article><strong>{wins}</strong><span>Vitórias</span></article>
          <article><strong>{losses}</strong><span>Derrotas</span></article>
          <article><strong>{draws}</strong><span>Empates</span></article>
        </div>
      ) : null}

      <div className="history-list">
        {account.games.length === 0 ? (
          <p className="muted">Nenhuma partida concluída ainda.</p>
        ) : (
          account.games.map((game) => (
            <Link href={`/partida/${game.id}`} className="history-row" key={game.id}>
              <strong>{resultFor(game, account.userId)}</strong>
              <span>{game.result === "draw" ? "Empate" : game.black_player_id === account.userId ? "Peças pretas" : "Peças brancas"}</span>
              <span>{game.move_count} jogadas</span>
              <time>{game.finished_at ? new Date(game.finished_at).toLocaleDateString("pt-BR") : ""}</time>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
