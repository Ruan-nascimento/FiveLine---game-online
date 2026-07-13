import Link from "next/link";
import { Bot, KeyRound, Users } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants/app";

function HeroBoardArt(): React.ReactElement {
  const winning = new Set([20, 30, 40, 50, 60]);
  const dark = new Set([11, 21, 29, 39, 48, 58, 67]);
  const light = new Set([12, 22, 31, 41, 51, 19, 28]);
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="hero-art-beams" />
      <div className="hero-art-board">
        {Array.from({ length: 81 }, (_, index) => {
          const isWin = winning.has(index);
          const tone = dark.has(index) ? "dark" : light.has(index) || isWin ? "light" : "";
          return (
            <span key={index} className={[tone && `mini-piece ${tone}`, isWin && "win-glow"].filter(Boolean).join(" ") || undefined} />
          );
        })}
      </div>
    </div>
  );
}

function HowToBoard({ variant }: { variant: "cluster" | "lines" }): React.ReactElement {
  if (variant === "cluster") {
    return (
      <div className="howto-board" aria-hidden="true">
        {Array.from({ length: 49 }, (_, index) => {
          const dark = [8, 16, 24].includes(index);
          const light = [9, 17, 25].includes(index);
          const focus = index === 18;
          return (
            <span
              key={index}
              className={[dark && "stone-d", light && "stone-l", focus && "stone-focus"].filter(Boolean).join(" ") || undefined}
            />
          );
        })}
      </div>
    );
  }
  return (
    <div className="howto-board howto-lines" aria-hidden="true">
      {Array.from({ length: 49 }, (_, index) => {
        const row = Math.floor(index / 7);
        const col = index % 7;
        const horiz = row === 2 && col >= 1 && col <= 5;
        const diag = col === row && row >= 1 && row <= 5;
        return <span key={index} className={horiz || diag ? "stone-l win-line" : undefined} />;
      })}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="landing-page">
      <section className="hero-dark">
        <div className="hero-copy-dark">
          <p className="hero-kicker">{APP_NAME}</p>
          <h1>{APP_TAGLINE}</h1>
          <p className="hero-lede-dark">
            Um clássico de estratégia redesenhado para partidas rápidas. Antecipe o adversário,
            construa suas linhas e conquiste o tabuleiro.
          </p>
          <div className="action-row">
            <Link className="button accent" href="/jogar">Jogar agora</Link>
            <Link className="button ghost" href="/como-jogar">Como jogar</Link>
          </div>
        </div>
        <HeroBoardArt />
      </section>

      <section className="challenge-section" id="desafios">
        <h2>Escolha seu Desafio</h2>
        <div className="challenge-grid">
          <article className="challenge-card">
            <Bot size={36} strokeWidth={1.6} />
            <h3>Modo IA</h3>
            <p>Treine contra a inteligência artificial em três níveis de dificuldade.</p>
            <Link className="button accent" href="/jogar/ia">Jogar</Link>
          </article>
          <article className="challenge-card">
            <Users size={36} strokeWidth={1.6} />
            <h3>Partida Casual</h3>
            <p>Encontre outro jogador e dispute partidas rápidas sem pressão de ranking.</p>
            <Link className="button accent" href="/multiplayer/buscar">Jogar</Link>
          </article>
          <article className="challenge-card">
            <KeyRound size={36} strokeWidth={1.6} />
            <h3>Sala Privada</h3>
            <p>Crie um código e desafie amigos em uma sala exclusiva.</p>
            <Link className="button accent" href="/multiplayer/criar">Jogar</Link>
          </article>
        </div>
      </section>

      <section className="howto-section" id="como-jogar">
        <div className="howto-visuals">
          <HowToBoard variant="cluster" />
          <HowToBoard variant="lines" />
        </div>
        <div className="howto-copy">
          <h2>Como jogar</h2>
          <p>
            Em cada turno, coloque uma peça em uma casa vazia do tabuleiro 15×15.
            Pretas começam. Planeje ataques e bloqueios ao mesmo tempo.
          </p>
          <p>
            Vence quem formar uma linha contínua de cinco ou mais peças — na horizontal,
            vertical ou diagonal. Simples de aprender, difícil de dominar.
          </p>
          <Link className="button ghost" href="/como-jogar">Ver regras completas</Link>
        </div>
      </section>

      <section className="ad-placeholder" aria-label="Espaço publicitário">
        <span className="ad-ribbon">PUBLICIDADE</span>
        <p>Espaço reservado para anúncios</p>
      </section>
    </div>
  );
}
