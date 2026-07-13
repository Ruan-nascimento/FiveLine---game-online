import { z } from "zod";

export const moveInputSchema = z.object({
  gameId: z.string().uuid(),
  row: z.number().int().min(0).max(14),
  col: z.number().int().min(0).max(14),
});

export const roomCodeSchema = z.string().trim().toUpperCase().regex(/^[A-F0-9]{6}$/, "Use o código de seis caracteres da sala.");
export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, "Use 3 a 24 caracteres: letras, números ou _. ");
