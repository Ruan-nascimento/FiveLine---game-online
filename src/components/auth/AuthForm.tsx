"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { BoardMark } from "@/components/brand/BoardMark";
import { GoogleGlyph } from "@/components/brand/GoogleGlyph";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/constants/app";

export function AuthForm(): React.ReactElement {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const signInWithGoogle = async () => {
    const supabase = createClient();
    if (!supabase) {
      setMessage("O Supabase ainda não está configurado neste ambiente.");
      return;
    }
    setPending(true);
    setMessage(null);
    const next = searchParams.get("next") || "/multiplayer";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      const providerDisabled =
        error.message.toLowerCase().includes("provider is not enabled") ||
        error.message.toLowerCase().includes("unsupported provider");
      setMessage(
        providerDisabled
          ? "O login com Google ainda não está habilitado no Supabase. Ative o provedor Google em Authentication → Providers e configure as credenciais OAuth."
          : error.message,
      );
      setPending(false);
    }
  };

  return (
    <section className="auth-card">
      <p className="brand-lockup compact">
        <BoardMark size={28} />
        <span>{APP_NAME}</span>
      </p>
      <h1>Entre para jogar online</h1>
      <p className="muted">
        Use sua conta Google para multiplayer, salas e histórico. Contra a IA você joga sem conta.
      </p>
      <div className="form-stack">
        {message ? <p className="form-message">{message}</p> : null}
        <button
          className="button primary large google-button"
          disabled={pending || !isSupabaseConfigured()}
          onClick={signInWithGoogle}
        >
          <GoogleGlyph />
          {pending ? "Redirecionando…" : "Continuar com Google"}
        </button>
      </div>
      <p className="muted">
        Prefere treinar sozinho? <Link className="text-link" href="/jogar/ia">Jogar contra a IA</Link>
      </p>
    </section>
  );
}
