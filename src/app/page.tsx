import Link from "next/link";
import { ArrowRight, Bot, KeyRound, Swords } from "lucide-react";
import { BoardMark } from "@/components/brand/BoardMark";
import { GoogleGlyph } from "@/components/brand/GoogleGlyph";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants/app";

function HeroBoard(): React.ReactElement {
  const dark = new Set([30, 40, 50, 60, 70]);
  const light = new Set([31, 41, 51, 61, 39]);
  return (
    <div className="hero-stage" aria-hidden="true">
      <div className="hero-board-glow" />
      <div className="mini-board hero-mini-board" aria-label="Demonstração de um tabuleiro com cinco peças alinhadas">
        {Array.from({ length: 81 }, (_, index) => (
          <span
            key={index}
            className={dark.has(index) ? "mini-piece dark" : light.has(index) ? "mini-piece light" : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-copy">
          <p className="brand-lockup">
            <BoardMark size={42} />
            <span>{APP_NAME}</span>
          </p>
          <h1>{APP_TAGLINE}</h1>
          <p className="hero-lede">
            Partidas rápidas de estratégia no tabuleiro 15×15. Entre contra a IA agora — sem conta.
          </p>
          <div className="action-row">
            <Link className="button primary play-cta" href="/jogar">
              Jogar agora <ArrowRight size={18} />
            </Link>
            <Link className="button secondary" href="/como-jogar">
              Como jogar
            </Link>
          </div>
        </div>
        <HeroBoard />
      </section>

      <section className="modes-section">
        <div className="section-head">
          <p className="eyebrow">Escolha sua partida</p>
          <h2>Três formas de jogar</h2>
        </div>
        <div className="mode-grid">
          <Link className="mode-tile" href="/jogar/ia">
            <Bot size={22} />
            <h3>Contra a IA</h3>
            <p>Treine sozinho em três níveis. Sem cadastro.</p>
            <span>Começar →</span>
          </Link>
          <Link className="mode-tile" href="/multiplayer">
            <Swords size={22} />
            <h3>Partida online</h3>
            <p>Encontre alguém e dispute em tempo real.</p>
            <span>Multiplayer →</span>
          </Link>
          <Link className="mode-tile" href="/multiplayer/criar">
            <KeyRound size={22} />
            <h3>Sala privada</h3>
            <p>Gere um código e desafie quem você quiser.</p>
            <span>Criar sala →</span>
          </Link>
        </div>
      </section>

      <section className="account-callout">
        <div>
          <p className="eyebrow">Conta</p>
          <h2>Entre com Google para jogar online</h2>
          <p>Salve o histórico, use o chat e dispute partidas ao vivo.</p>
        </div>
        <Link className="button primary google-button" href="/entrar">
          <GoogleGlyph /> Continuar com Google
        </Link>
      </section>
    </div>
  );
}
