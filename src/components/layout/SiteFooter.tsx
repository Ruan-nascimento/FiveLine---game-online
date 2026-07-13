"use client";

import Link from "next/link";
import { Facebook, Instagram, Youtube } from "lucide-react";
import { BoardMark } from "@/components/brand/BoardMark";
import { APP_NAME } from "@/lib/constants/app";

function XIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

export function SiteFooter(): React.ReactElement {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand-block">
          <Link href="/" className="brand">
            <BoardMark size={22} />
            <span>{APP_NAME}</span>
          </Link>
          <p>Estratégia em cada jogada. Cinco em linha, partidas rápidas.</p>
        </div>
        <div className="footer-columns">
          <div>
            <strong>Jogo</strong>
            <Link href="/">Início</Link>
            <Link href="/jogar">Jogar</Link>
            <Link href="/historico">Classificação</Link>
            <Link href="/como-jogar">Sobre</Link>
          </div>
          <div>
            <strong>Conta</strong>
            <Link href="/entrar">Entrar</Link>
            <Link href="/entrar">Criar conta</Link>
            <Link href="/perfil">Perfil</Link>
            <Link href="/multiplayer">Multijogador</Link>
          </div>
          <div>
            <strong>Legal</strong>
            <Link href="/termos">Termos</Link>
            <Link href="/termos">Privacidade</Link>
            <Link href="/como-jogar">Como jogar</Link>
          </div>
        </div>
        <div className="footer-social" aria-label="Redes sociais">
          <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube"><Youtube size={18} /></a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={18} /></a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={18} /></a>
          <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X"><XIcon /></a>
        </div>
      </div>
      <div className="footer-bottom">
        © {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
      </div>
    </footer>
  );
}
