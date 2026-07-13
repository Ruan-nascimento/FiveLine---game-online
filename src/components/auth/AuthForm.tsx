"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type FormMode = "login" | "signup" | "reset";

export function AuthForm({ mode }: { mode: FormMode }): React.ReactElement {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, setPending] = useState(false);
  const title = mode === "login" ? "Entre na sua conta" : mode === "signup" ? "Crie sua conta" : "Recupere sua senha";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) { setIsError(true); setMessage("O Supabase ainda não está configurado neste ambiente."); return; }
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");
    const username = String(values.get("username") ?? "").trim().toLowerCase();
    setPending(true); setMessage(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(new URLSearchParams(window.location.search).get("next") || "/multiplayer"); router.refresh();
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: `${window.location.origin}/entrar` } });
        if (error) throw error;
        setIsError(false); setMessage("Conta criada. Verifique seu e-mail para confirmar o acesso.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/entrar` });
        if (error) throw error;
        setIsError(false); setMessage("Se o e-mail existir, enviaremos as instruções de recuperação.");
      }
    } catch (error) { setIsError(true); setMessage(error instanceof Error ? error.message : "Não foi possível concluir a operação."); }
    finally { setPending(false); }
  };

  return <section className="auth-card"><p className="eyebrow">{mode === "login" ? "Bem-vindo de volta" : "Multiplayer e histórico"}</p><h1>{title}</h1><p className="muted">{mode === "login" ? "Use sua conta para jogar online." : mode === "signup" ? "Escolha um nome único para aparecer nas partidas." : "Informe seu e-mail para receber um link seguro."}</p>
    <form className="form-stack" onSubmit={submit}>{mode === "signup" ? <label>Nome de usuário<input name="username" minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" required autoComplete="username" /></label> : null}<label>E-mail<input name="email" type="email" required autoComplete="email" /></label>{mode !== "reset" ? <label>Senha<input name="password" type="password" minLength={8} required autoComplete={mode === "login" ? "current-password" : "new-password"} /></label> : null}{message ? <p className={`form-message ${isError ? "" : "form-success"}`}>{message}</p> : null}<button className="button primary large" disabled={pending || !isSupabaseConfigured()}>{pending ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar instruções"}</button></form>
    <p className="muted">{mode === "login" ? <><Link className="text-link" href="/recuperar-senha">Esqueci minha senha</Link><br />Ainda não tem conta? <Link className="text-link" href="/cadastrar">Cadastre-se</Link></> : <><Link className="text-link" href="/entrar">Voltar para entrar</Link></>}</p>
  </section>;
}
