import Link from "next/link";
import { BrainCircuit, Menu } from "lucide-react";
import { APP_NAME } from "@/lib/constants/app";

export function SiteHeader(): React.ReactElement {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label={`${APP_NAME}, página inicial`}>
        <BrainCircuit aria-hidden="true" size={23} /> <span>{APP_NAME}</span>
      </Link>
      <nav className="main-nav" aria-label="Navegação principal">
        <Link href="/jogar">Jogar</Link>
        <Link href="/como-jogar">Como jogar</Link>
        <Link href="/multiplayer">Multiplayer</Link>
        <Link className="nav-account" href="/entrar">Entrar</Link>
      </nav>
      <Menu className="mobile-menu-icon" aria-label="Menu de navegação" />
    </header>
  );
}
