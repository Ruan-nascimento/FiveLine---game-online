"use client";
import { useEffect, useState } from "react";
import { AIGame } from "@/components/game/AIGame";
import { AI_SETTINGS_KEY } from "@/lib/constants/app";
import type { AIDifficulty, Player } from "@/features/game/types";

export default function AIGamePage() {
  const [settings, setSettings] = useState<{ difficulty: AIDifficulty; localPlayer: Player }>({ difficulty: "medium", localPlayer: 1 });
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(AI_SETTINGS_KEY);
        if (saved) setSettings(JSON.parse(saved) as { difficulty: AIDifficulty; localPlayer: Player });
      } catch { /* Keep the safe default when local storage is unavailable or malformed. */ }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);
  return <section className="page-shell game-page"><AIGame key={`${settings.difficulty}-${settings.localPlayer}`} {...settings} /></section>;
}
