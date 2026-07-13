"use client";

import { RotateCcw, Flag, BrainCircuit } from "lucide-react";
import { GomokuBoard } from "./GomokuBoard";
import { GameResultModal } from "./GameResultModal";
import { TurnIndicator } from "./TurnIndicator";
import { useAIGame } from "@/features/game/hooks/useAIGame";
import type { AIDifficulty, Player } from "@/features/game/types";

export function AIGame({ difficulty, localPlayer }: { difficulty: AIDifficulty; localPlayer: Player }): React.ReactElement {
  const game = useAIGame({ difficulty, localPlayer });
  const localTurn = game.currentPlayer === localPlayer;
  const status = game.result ? "Partida concluída" : game.isThinking ? "IA pensando…" : localTurn ? "Seu turno" : "Turno da IA";
  const restart = () => { if (window.confirm("Reiniciar a partida atual?")) game.restart(); };
  const resign = () => { if (window.confirm("Deseja desistir desta partida?")) game.resign(); };
  return (
    <section className="game-layout" aria-live="polite">
      <div className="game-main">
        <div className="game-status-mobile"><span className="status-dot" />{status}</div>
        <GomokuBoard board={game.board} currentPlayer={game.currentPlayer} disabled={!localTurn || game.isThinking || Boolean(game.result)} lastMove={game.lastMove} winningLine={game.winningLine} onCellClick={game.play} />
        <div className="game-actions mobile-actions">
          <button className="button secondary" onClick={restart}><RotateCcw size={17} /> Reiniciar</button>
          <button className="button danger" onClick={resign}><Flag size={17} /> Desistir</button>
        </div>
      </div>
      <aside className="game-sidebar">
        <p className="eyebrow">Contra IA · {difficulty}</p>
        <h1>Partida em andamento</h1>
        <div className="player-card active-player"><span className={`player-stone stone-${localPlayer}`} /><div><strong>Você</strong><span>{localPlayer === 1 ? "Peças pretas" : "Peças brancas"}</span></div></div>
        <div className="versus">VS</div>
        <div className="player-card"><span className={`player-stone stone-${game.aiPlayer}`} /><div><strong>IA Estratégica</strong><span>{game.aiPlayer === 1 ? "Peças pretas" : "Peças brancas"}</span></div><BrainCircuit size={19} /></div>
        <div className="status-card"><span className="status-dot" />{status}</div>
        {!game.result ? <TurnIndicator player={game.currentPlayer} label={localTurn ? "Você" : "A IA"} /> : null}
        <p className="move-count">{game.moveCount} {game.moveCount === 1 ? "jogada" : "jogadas"}</p>
        <div className="game-actions desktop-actions">
          <button className="button secondary" onClick={restart}><RotateCcw size={17} /> Reiniciar</button>
          <button className="button danger" onClick={resign}><Flag size={17} /> Desistir</button>
        </div>
      </aside>
      {game.result ? <GameResultModal result={game.result} localPlayer={localPlayer} moves={game.moveCount} onPlayAgain={game.restart} /> : null}
    </section>
  );
}
