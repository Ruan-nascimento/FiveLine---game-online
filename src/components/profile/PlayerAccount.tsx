"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { OnlineGameRecord } from "@/features/multiplayer/types";

interface AccountData { username: string; createdAt: string; games: OnlineGameRecord[]; userId: string; }

function resultFor(game: OnlineGameRecord, userId: string): "Vitória" | "Derrota" | "Empate" { if (game.result === "draw") return "Empate"; return game.winner_player_id === userId ? "Vitória" : "Derrota"; }

export function PlayerAccount({ historyOnly = false }: { historyOnly?: boolean }): React.ReactElement {
  const [account, setAccount] = useState<AccountData | null>(null); const [message, setMessage] = useState("Carregando seu perfil…");
  useEffect(() => { const supabase = createClient(); if (!supabase) return; const load = async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) { setMessage("Entre na sua conta para acessar esta página."); return; } const [{ data: profile }, { data: games, error }] = await Promise.all([supabase.from("profiles").select("username, created_at").eq("id", user.id).single(), supabase.from("games").select("*").or(`black_player_id.eq.${user.id},white_player_id.eq.${user.id}`).eq("status", "finished").order("finished_at", { ascending: false }).limit(30)]); if (error) { setMessage("Não foi possível carregar o histórico."); return; } setAccount({ username: (profile as { username: string; created_at: string } | null)?.username ?? "Jogador", createdAt: (profile as { username: string; created_at: string } | null)?.created_at ?? user.created_at, games: (games ?? []) as unknown as OnlineGameRecord[], userId: user.id }); setMessage(""); }; void load(); }, []);
  const logout = async () => { const supabase = createClient(); await supabase?.auth.signOut(); window.location.assign("/"); };
  if (!isSupabaseConfigured()) return <section className="waiting-card"><h1>Configure o Supabase para acessar perfil e histórico.</h1></section>;
  if (!account) return <section className="waiting-card"><h1>{message}</h1>{message.startsWith("Entre") ? <Link className="button primary" href="/entrar">Entrar</Link> : null}</section>;
  const wins = account.games.filter((game) => resultFor(game, account.userId) === "Vitória").length; const losses = account.games.filter((game) => resultFor(game, account.userId) === "Derrota").length; const draws = account.games.length - wins - losses;
  return <section className="page-shell"><div className="profile-header"><div><p className="eyebrow">{historyOnly ? "Histórico de partidas" : "Seu perfil"}</p><h1>{historyOnly ? "Suas partidas" : `Olá, ${account.username}`}</h1>{!historyOnly ? <p className="muted">Conta criada em {new Date(account.createdAt).toLocaleDateString("pt-BR")}</p> : null}</div><button className="button secondary" onClick={logout}><LogOut size={16} /> Sair</button></div>{!historyOnly ? <div className="stats-grid"><article><strong>{account.games.length}</strong><span>Partidas</span></article><article><strong>{wins}</strong><span>Vitórias</span></article><article><strong>{losses}</strong><span>Derrotas</span></article><article><strong>{draws}</strong><span>Empates</span></article></div> : null}<div className="history-list">{account.games.length === 0 ? <p className="muted">Nenhuma partida concluída ainda.</p> : account.games.map((game) => <Link href={`/partida/${game.id}`} className="history-row" key={game.id}><strong>{resultFor(game, account.userId)}</strong><span>{game.result === "draw" ? "Empate" : game.black_player_id === account.userId ? "Peças pretas" : "Peças brancas"}</span><span>{game.move_count} jogadas</span><time>{game.finished_at ? new Date(game.finished_at).toLocaleDateString("pt-BR") : ""}</time></Link>)}</div></section>;
}
