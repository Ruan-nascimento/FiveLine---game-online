"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { BoardMark } from "@/components/brand/BoardMark";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { APP_NAME } from "@/lib/constants/app";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { syncProfileAvatar } from "@/lib/supabase/avatar";

export function SiteHeader(): React.ReactElement {
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUsername(null);
        setAvatar(null);
        setLoading(false);
        return;
      }
      const synced = await syncProfileAvatar(supabase, user);
      const { data } = await supabase.from("profiles").select("display_name, username, avatar_key").eq("id", user.id).maybeSingle();
      const profile = data as { display_name: string | null; username: string; avatar_key: string | null } | null;
      setUsername(profile?.display_name?.trim() || profile?.username || "Jogador");
      setAvatar(synced || profile?.avatar_key || null);
      setLoading(false);
    };
    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void load(); });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label={`${APP_NAME}, página inicial`}>
        <BoardMark size={26} />
        <span>{APP_NAME}</span>
      </Link>
      <nav className="main-nav" aria-label="Navegação principal">
        <Link href="/jogar">Jogar</Link>
        <Link href="/como-jogar">Como jogar</Link>
        {isSupabaseConfigured() && username ? <Link href="/multiplayer">Multiplayer</Link> : null}
        {!loading && username ? (
          <Link className="nav-account profile-link" href="/perfil">
            <PlayerAvatar src={avatar} name={username} size={22} />
            {username}
          </Link>
        ) : (
          <Link className="nav-account" href="/entrar">Entrar</Link>
        )}
      </nav>
      <Menu className="mobile-menu-icon" aria-label="Menu de navegação" />
    </header>
  );
}
