/// <reference lib="webworker" />
import { chooseAIMove } from "./ai";
import type { AIRequest, AIResponse } from "../types";

self.onmessage = (event: MessageEvent<AIRequest>) => {
  try {
    self.postMessage({ success: true, data: chooseAIMove(event.data) } satisfies { success: boolean; data: AIResponse });
  } catch (error) {
    self.postMessage({ success: false, message: error instanceof Error ? error.message : "AI_WORKER_FAILED" });
  }
};

export {};
