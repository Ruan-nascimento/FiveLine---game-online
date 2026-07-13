"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function CreatePrivateRoom(): React.ReactElement {
  const router = useRouter(); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false);
  const create = async () => { const supabase = createClient(); if (!supabase) { setError("Configure o Supabase para criar uma sala."); return; } setPending(true); const { data, error: rpcError } = await supabase.rpc("create_private_room"); setPending(false); if (rpcError || !data) { setError("Não foi possível criar a sala."); return; } router.push(`/partida/${data}`); };
  return <section className="auth-card"><p className="eyebrow">Convide uma pessoa</p><h1>Crie uma sala privada</h1><p className="muted">Você receberá um código e um link compartilhável. Salas vazias expiram automaticamente.</p>{error ? <p className="form-message">{error}</p> : null}<button className="button primary large" disabled={pending} onClick={create}>{pending ? "Criando…" : "Criar sala"}</button></section>;
}

export function JoinPrivateRoom(): React.ReactElement {
  const router = useRouter(); const search = useSearchParams(); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false);
  const join = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const code = String(new FormData(event.currentTarget).get("code") ?? "").trim().toUpperCase(); const supabase = createClient(); if (!supabase) { setError("Configure o Supabase para entrar em uma sala."); return; } setPending(true); const { data, error: rpcError } = await supabase.rpc("join_private_room", { p_room_code: code }); setPending(false); if (rpcError || !data) { setError("Sala não encontrada, indisponível ou já iniciada."); return; } router.push(`/partida/${data}`); };
  return <section className="auth-card"><p className="eyebrow">Código da sala</p><h1>Entre em uma partida</h1><p className="muted">Cole o código de seis caracteres recebido no convite.</p><form className="form-stack" onSubmit={join}><label>Código<input name="code" maxLength={6} defaultValue={search.get("codigo") ?? ""} required autoCapitalize="characters" /></label>{error ? <p className="form-message">{error}</p> : null}<button className="button primary large" disabled={pending}>{pending ? "Entrando…" : "Entrar na sala"}</button></form></section>;
}

export function RoomCode({ code, gameId }: { code: string; gameId: string }): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(`${window.location.origin}/multiplayer/entrar?codigo=${code}`); setCopied(true); };
  return <div className="room-code"><span>Seu código</span><strong>{code}</strong><button className="button secondary" onClick={copy}><Copy size={16} /> {copied ? "Copiado" : "Copiar link"}</button><small>ID da partida: {gameId.slice(0, 8)}</small></div>;
}
