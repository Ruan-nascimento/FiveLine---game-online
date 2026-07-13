"use client";

import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function MultiplayerNotice(): React.ReactElement | null {
  if (isSupabaseConfigured()) return null;
  return <div className="multiplayer-notice"><strong>Multiplayer ainda não configurado.</strong><span>Adicione as variáveis do Supabase e execute a migration incluída para ativar conta, salas e partidas em tempo real.</span></div>;
}

export function AccountRequired(): React.ReactElement { return <section className="auth-card"><p className="eyebrow">Partidas entre pessoas</p><h1>Crie uma conta gratuita para jogar contra outras pessoas.</h1><p className="muted">Sua conta permite salas privadas, busca rápida e histórico básico.</p><div className="action-row"><Link className="button primary" href="/cadastrar">Criar conta</Link><Link className="button secondary" href="/entrar">Entrar</Link></div></section>; }
