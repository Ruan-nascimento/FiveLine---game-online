"use client";

import Link from "next/link";
import { GoogleGlyph } from "@/components/brand/GoogleGlyph";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function MultiplayerNotice(): React.ReactElement | null {
  if (isSupabaseConfigured()) return null;
  return (
    <div className="multiplayer-notice">
      <strong>Multijogador ainda não configurado.</strong>
      <span>Adicione as variáveis do Supabase e execute a migration incluída para ativar conta, salas e partidas em tempo real.</span>
    </div>
  );
}

export function AccountRequired(): React.ReactElement {
  return (
    <section className="auth-card">
      <p className="eyebrow">Partidas entre pessoas</p>
      <h1>Entre com Google para jogar contra outras pessoas.</h1>
      <p className="muted">Salas privadas, busca rápida e histórico ficam disponíveis após o login.</p>
      <div className="action-row">
        <Link className="button primary google-button" href="/entrar">
          <GoogleGlyph /> Entrar com Google
        </Link>
        <Link className="button secondary" href="/jogar/ia">
          Jogar contra IA
        </Link>
      </div>
    </section>
  );
}
