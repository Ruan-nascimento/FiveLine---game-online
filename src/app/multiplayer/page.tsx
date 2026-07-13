import Link from "next/link";
import { DoorOpen, KeyRound, Search, ShieldCheck } from "lucide-react";
import { MultiplayerNotice } from "@/components/multiplayer/MultiplayerNotice";

export default function MultiplayerPage() {
  return (
    <section className="page-shell">
      <p className="eyebrow">Partidas casuais</p>
      <h1>Desafie outra pessoa.</h1>
      <p className="muted">Busca rápida, salas públicas e privadas. O servidor valida cada jogada.</p>
      <MultiplayerNotice />
      <div className="play-options">
        <Link href="/multiplayer/buscar" className="play-option">
          <Search />
          <h2>Busca rápida</h2>
          <p>Entre na fila e encontre um adversário disponível.</p>
          <span>Buscar adversário →</span>
        </Link>
        <Link href="/multiplayer/entrar" className="play-option">
          <DoorOpen />
          <h2>Entrar em sala</h2>
          <p>Digite um código ou escolha uma sala pública na lista.</p>
          <span>Ver salas →</span>
        </Link>
        <Link href="/multiplayer/criar" className="play-option">
          <KeyRound />
          <h2>Criar sala</h2>
          <p>Defina se a sala é pública ou privada e compartilhe o código.</p>
          <span>Criar sala →</span>
        </Link>
        <article className="play-option">
          <ShieldCheck />
          <h2>Jogo seguro</h2>
          <p>Turnos, tabuleiro e resultado são sempre decididos no servidor.</p>
        </article>
      </div>
    </section>
  );
}
