import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PAYPAL_ENABLED: z.enum(["true", "false"]).default("false"),
  BREVO_API_KEY: z.string().min(1).optional(),
  QUOTE_SIGNING_SECRET: z.string().min(32).optional(),
  AI_PROVIDER_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_DEMO: z.enum(["true", "false"]).default("true"),
});

export type EnvSource = Record<string, string | undefined>;

export function parseServerEnv(source: EnvSource): z.infer<typeof serverEnvSchema> {
  return serverEnvSchema.parse({
    NODE_ENV: source.NODE_ENV,
    URL: source.URL,
    DATABASE_URL: source.DATABASE_URL,
    SUPABASE_URL: source.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: source.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: source.STRIPE_WEBHOOK_SECRET,
    STRIPE_PAYPAL_ENABLED: source.STRIPE_PAYPAL_ENABLED,
    BREVO_API_KEY: source.BREVO_API_KEY,
    QUOTE_SIGNING_SECRET: source.QUOTE_SIGNING_SECRET,
    AI_PROVIDER_KEY: source.AI_PROVIDER_KEY,
    CRON_SECRET: source.CRON_SECRET,
  });
}

export function parseClientEnv(source: EnvSource): z.infer<typeof clientEnvSchema> {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_DEMO: source.NEXT_PUBLIC_DEMO,
  });
}