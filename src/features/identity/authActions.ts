"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverEnv } from "@/lib/env/server";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { isSupabaseStaffAuthConfigured } from "./authConfig";
import {
  buildAuthCallbackUrl,
  getAdminLoginPath,
  getAdminPasswordPath,
  getAdminPath,
  parseAuthLocale,
} from "./authPaths";
import { getCurrentStaff } from "./session";

export type AuthActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[]>;
};

const signInSchema = z.object({
  locale: z.string(),
  email: z.string().trim().email(),
  password: z.string().min(8),
});

const emailSchema = z.object({
  locale: z.string(),
  email: z.string().trim().email(),
});

const passwordSchema = z
  .object({
    locale: z.string(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match.",
  });

export async function signInWithPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseStaffAuthConfigured()) return authNotConfigured();

  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailed(parsed.error);

  const locale = parseAuthLocale(parsed.data.locale);
  const client = await createSupabaseSessionClient();
  const { error } = await client.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return errorState("Email or password is not valid.");

  const staff = await getCurrentStaff();
  if (!staff) {
    await client.auth.signOut();
    return errorState("This Supabase user is not an active staff member.");
  }

  redirect(getAdminPath(locale));
}

export async function sendMagicLinkAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseStaffAuthConfigured()) return authNotConfigured();

  const parsed = emailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailed(parsed.error);

  const locale = parseAuthLocale(parsed.data.locale);
  const origin = await getRequestOrigin();
  if (!origin) return errorState("Set URL before sending staff email links.");

  const client = await createSupabaseSessionClient();
  const { error } = await client.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: buildAuthCallbackUrl(origin, getAdminPath(locale)),
    },
  });
  if (error) return errorState("Magic link could not be sent.");

  return {
    status: "success",
    message: "Magic link sent. Check the staff mailbox.",
  };
}

export async function sendPasswordResetAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseStaffAuthConfigured()) return authNotConfigured();

  const parsed = emailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailed(parsed.error);

  const locale = parseAuthLocale(parsed.data.locale);
  const origin = await getRequestOrigin();
  if (!origin) return errorState("Set URL before sending staff email links.");

  const client = await createSupabaseSessionClient();
  const { error } = await client.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: buildAuthCallbackUrl(origin, getAdminPasswordPath(locale)),
  });
  if (error) return errorState("Password reset email could not be sent.");

  return {
    status: "success",
    message: "Password reset email sent. Check the staff mailbox.",
  };
}

export async function updatePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseStaffAuthConfigured()) return authNotConfigured();

  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailed(parsed.error);

  const locale = parseAuthLocale(parsed.data.locale);
  const client = await createSupabaseSessionClient();
  const { error } = await client.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return errorState("Password could not be updated.");

  const staff = await getCurrentStaff();
  if (!staff) {
    await client.auth.signOut();
    redirect(getAdminLoginPath(locale));
  }

  redirect(getAdminPath(locale));
}

export async function signOutAction(locale: string): Promise<void> {
  if (isSupabaseStaffAuthConfigured()) {
    const client = await createSupabaseSessionClient();
    await client.auth.signOut();
  }
  redirect(getAdminLoginPath(parseAuthLocale(locale)));
}

async function getRequestOrigin(): Promise<string | null> {
  if (serverEnv.URL) return serverEnv.URL;
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) return null;
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

function authNotConfigured(): AuthActionState {
  return errorState("Supabase staff auth is not configured yet.");
}

function errorState(message: string): AuthActionState {
  return { status: "error", message };
}

function validationFailed(error: z.ZodError): AuthActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(error.flatten().fieldErrors)) {
    if (messages?.length) fieldErrors[field] = messages;
  }
  return {
    status: "error",
    message: "Check the highlighted fields.",
    fieldErrors,
  };
}
