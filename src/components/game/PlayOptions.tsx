"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bot, Users, DoorOpen, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GoogleGlyph } from "@/components/brand/GoogleGlyph";

const options = [
  { href: "/jogar/ia", icon: Bot, title: "Jogar contra IA", text: "Treinamento individual, três níveis e início imediato.", note: "Não exige conta", requiresAuth: false },
  { href: "/multiplayer/buscar", icon: Users, title: "Busca rápida", text: "Encontre outra pessoa para uma partida casual.", note: "Exige conta", requiresAuth: true },
  { href: "/multiplayer/criar", icon: KeyRound, title: "Criar sala", text: "Gere um código e um link para convidar alguém.", note: "Exige conta", requiresAuth: true },
  { href: "/multiplayer/entrar", icon: DoorOpen, title: "Entrar em sala", text: "Use o código compartilhado pelo anfitrião.", note: "Exige conta", requiresAuth: true },
];

export function PlayOptions(): React.ReactElement {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setAuthenticated(false);
      return;
    }
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      setAuthenticated(Boolean(data.user));
    };
    void load();
  }, []);

  return (
    <div className="play-options">
      {options.map(({ href, icon: Icon, title, text, note, requiresAuth }) => {
        const locked = requiresAuth && authenticated === false;
        if (locked) {
          return (
            <article className="play-option locked" key={title}>
              <Icon />
              <span className="option-note">{note}</span>
              <h2>{title}</h2>
              <p>{text}</p>
              <Link className="text-link google-inline" href={`/entrar?next=${encodeURIComponent(href)}`}>
                <GoogleGlyph size={14} /> Entrar com Google para continuar →
              </Link>
            </article>
          );
        }
        return (
          <Link href={href} className="play-option" key={title}>
            <Icon />
            <span className="option-note">{note}</span>
            <h2>{title}</h2>
            <p>{text}</p>
            <span>Continuar →</span>
          </Link>
        );
      })}
    </div>
  );
}
