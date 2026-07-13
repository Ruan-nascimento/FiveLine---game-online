"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function Matchmaking(): React.ReactElement {
  const router = useRouter();
  const [status, setStatus] = useState("Entrando na fila…");
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    let active = true;
    const find = async () => {
      const { data, error: rpcError } = await supabase.rpc("find_or_create_match");
      if (!active) return;
      if (rpcError) { setError("Não foi possível entrar na fila. Tente novamente."); return; }
      if (data) { router.replace(`/partida/${data}`); return; }
      setStatus("Procurando um adversário…");
    };
    void find();
    intervalRef.current = setInterval(() => { void find(); }, 2_500);
    return () => { active = false; if (intervalRef.current) clearInterval(intervalRef.current); void supabase.rpc("leave_matchmaking"); };
  }, [router]);
  if (!isSupabaseConfigured()) return <section className="waiting-card"><h1>Configure o Supabase para usar a busca rápida.</h1></section>;
  return <section className="waiting-card"><LoaderCircle className="spin" size={34} /><h1>{error ? "Não foi possível buscar" : status}</h1><p className="muted">{error ?? "Você será redirecionado assim que houver uma partida."}</p><button className="button secondary" onClick={() => router.push("/multiplayer")}>Cancelar</button></section>;
}
