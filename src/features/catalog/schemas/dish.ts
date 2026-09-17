import { z } from "zod";

export const dishSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  priceCents: z.number().int().positive(),
});
