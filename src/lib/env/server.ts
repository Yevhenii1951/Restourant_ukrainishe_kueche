import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_DEMO: z.enum(["true", "false"]).optional(),
});

export const env = serverSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_DEMO: process.env.NEXT_PUBLIC_DEMO,
});
