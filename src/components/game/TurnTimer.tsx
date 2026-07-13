"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function TurnTimer({ deadline, active }: { deadline: string | null; active: boolean }): React.ReactElement | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!active || !deadline) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const ms = new Date(deadline).getTime() - Date.now();
      setRemaining(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [active, deadline]);

  if (!active || remaining === null) return null;

  const urgent = remaining <= 10;
  return (
    <div className={`turn-timer ${urgent ? "urgent" : ""}`} role="timer" aria-live="polite">
      <span className="turn-timer-label">Tempo do turno</span>
      <strong>{remaining}s</strong>
    </div>
  );
}
