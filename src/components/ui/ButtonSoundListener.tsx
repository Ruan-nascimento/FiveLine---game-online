"use client";

import { useEffect } from "react";
import { playSound, unlockAudio } from "@/lib/audio/sounds";

/** Plays a soft click for primary UI buttons site-wide. */
export function ButtonSoundListener(): null {
  useEffect(() => {
    const unlock = () => unlockAudio();
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button, .button, a.button");
      if (!button) return;
      if (button instanceof HTMLButtonElement && button.disabled) return;
      playSound("click");
    };
    document.addEventListener("pointerdown", unlock, { once: true, passive: true });
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
  return null;
}
