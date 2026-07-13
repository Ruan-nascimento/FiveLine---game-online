import { SOUND_SETTINGS_KEY } from "@/lib/constants/app";

export type SoundId =
  | "place"
  | "opponentPlace"
  | "win"
  | "lose"
  | "gameStart"
  | "chatIn"
  | "chatOut"
  | "click"
  | "yourTurn"
  | "turnPassed";

type Tone = { freq: number; duration: number; type?: OscillatorType; gain?: number; delay?: number };

const PATTERNS: Record<SoundId, Tone[]> = {
  place: [{ freq: 520, duration: 0.07, type: "triangle", gain: 0.08 }],
  opponentPlace: [{ freq: 380, duration: 0.08, type: "triangle", gain: 0.07 }],
  win: [
    { freq: 523, duration: 0.1, type: "sine", gain: 0.09 },
    { freq: 659, duration: 0.1, type: "sine", gain: 0.09, delay: 0.1 },
    { freq: 784, duration: 0.18, type: "sine", gain: 0.1, delay: 0.2 },
  ],
  lose: [
    { freq: 392, duration: 0.12, type: "sine", gain: 0.08 },
    { freq: 311, duration: 0.18, type: "sine", gain: 0.08, delay: 0.12 },
  ],
  gameStart: [
    { freq: 440, duration: 0.08, type: "sine", gain: 0.07 },
    { freq: 554, duration: 0.12, type: "sine", gain: 0.08, delay: 0.09 },
  ],
  chatIn: [{ freq: 880, duration: 0.05, type: "sine", gain: 0.05 }],
  chatOut: [{ freq: 660, duration: 0.045, type: "sine", gain: 0.05 }],
  click: [{ freq: 740, duration: 0.03, type: "square", gain: 0.03 }],
  yourTurn: [
    { freq: 698, duration: 0.06, type: "triangle", gain: 0.07 },
    { freq: 880, duration: 0.08, type: "triangle", gain: 0.07, delay: 0.07 },
  ],
  turnPassed: [
    { freq: 330, duration: 0.08, type: "sine", gain: 0.06 },
    { freq: 247, duration: 0.1, type: "sine", gain: 0.06, delay: 0.09 },
  ],
};

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  audioCtx ??= new AudioCtx();
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(SOUND_SETTINGS_KEY);
  if (raw === null) return true;
  return raw === "1" || raw === "true";
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_SETTINGS_KEY, enabled ? "1" : "0");
}

function playTone(ctx: AudioContext, tone: Tone, when: number): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = tone.type ?? "sine";
  oscillator.frequency.value = tone.freq;
  const peak = tone.gain ?? 0.06;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + tone.duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(when);
  oscillator.stop(when + tone.duration + 0.02);
}

export function playSound(id: SoundId): void {
  if (!isSoundEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  const now = ctx.currentTime;
  for (const tone of PATTERNS[id]) {
    playTone(ctx, tone, now + (tone.delay ?? 0));
  }
}

export function unlockAudio(): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
}
