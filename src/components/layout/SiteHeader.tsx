"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BoardMark } from "@/components/brand/BoardMark";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { APP_NAME } from "@/lib/constants/app";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { syncProfileAvatar } from "@/lib/supabase/avatar";

const marketingLinks = [
  { href: "/", label: "Início" },
  { href: "/jogar", label: "Jogar" },
  { href: "/historico", label: "Histórico" },
  { href: "/como-jogar", label: "Sobre" },
  { href: "/termos", label: "Novidades" },
];

export function SiteHeader(): React.ReactElement {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label={`${APP_NAME}, página inicial`}>
        <BoardMark size={26} />
        <span>{APP_NAME}</span>
      </Link>

      <nav className={`main-nav ${menuOpen ? "open" : ""}`} aria-label="Navegação principal">
        {marketingLinks.map((link) => (
          <Link key={link.href} href={link.href} className={pathname === link.href ? "nav-active" : undefined}>
            {link.label}
          </Link>
        ))}
        {isSupabaseConfigured() && username ? <Link href="/multiplayer">Multijogador</Link> : null}
        {!loading && username ? (
          <Link className="nav-account profile-link" href="/perfil">
            <PlayerAvatar src={avatar} name={username} size={22} />
            {username}
          </Link>
        ) : (
          <div className="header-auth">
            <Link className="button ghost" href="/entrar">Entrar</Link>
            <Link className="button accent" href="/entrar">Criar conta</Link>
          </div>
        )}
      </nav>

      <button
        type="button"
        className="mobile-menu-toggle"
        aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
    </header>
  );
}
