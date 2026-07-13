"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { AI_SETTINGS_KEY } from "@/lib/constants/app";
import type { AIDifficulty, Player } from "@/features/game/types";

export function AIGameSetup(): React.ReactElement {
  const [difficulty, setDifficulty] = useState<AIDifficulty>("medium");
  const [color, setColor] = useState<"black" | "white" | "random">("black");
  const [sound, setSound] = useState(false);
  const begin = () => {
    const localPlayer: Player = color === "random" ? (Math.random() > 0.5 ? 1 : 2) : color === "black" ? 1 : 2;
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify({ difficulty, localPlayer, sound }));
    window.location.assign("/partida/ia");
  };
  return <div className="setup-card">
    <div><p className="eyebrow">Treinamento individual</p><h1>Configure sua partida</h1><p className="muted">Você pode mudar essas opções a qualquer momento antes da próxima partida.</p></div>
    <fieldset><legend>Dificuldade</legend><div className="choice-grid">{(["easy", "medium", "hard"] as AIDifficulty[]).map((value) => <label className={`choice ${difficulty === value ? "selected" : ""}`} key={value}><input type="radio" name="difficulty" value={value} checked={difficulty === value} onChange={() => setDifficulty(value)} /><strong>{{ easy: "Fácil", medium: "Médio", hard: "Difícil" }[value]}</strong><span>{{ easy: "Erros controlados", medium: "Equilibra ataque e defesa", hard: "Planeja combinações" }[value]}</span></label>)}</div></fieldset>
    <fieldset><legend>Suas peças</legend><div className="segmented">{(["black", "white", "random"] as const).map((value) => <label key={value}><input type="radio" name="color" checked={color === value} onChange={() => setColor(value)} />{{ black: "Pretas", white: "Brancas", random: "Aleatório" }[value]}</label>)}</div></fieldset>
    <label className="toggle"><input type="checkbox" checked={sound} onChange={(event) => setSound(event.target.checked)} /><Volume2 size={18} /> Ativar sons discretos</label>
    <button className="button primary large" onClick={begin}>Começar partida</button>
  </div>;
}
