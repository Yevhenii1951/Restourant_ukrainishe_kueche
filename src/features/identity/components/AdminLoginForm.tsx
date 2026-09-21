"use client";

import { useActionState } from "react";
import {
  sendMagicLinkAction,
  sendPasswordResetAction,
  signInWithPasswordAction,
  type AuthActionState,
} from "@/features/identity/authActions";

const initialAuthActionState: AuthActionState = {
  status: "idle",
  message: "",
};

type AdminLoginFormProps = {
  locale: string;
};

export function AdminLoginForm({
  locale,
}: AdminLoginFormProps): React.ReactNode {
  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPasswordAction,
    initialAuthActionState,
  );
  const [magicState, magicAction, magicPending] = useActionState(
    sendMagicLinkAction,
    initialAuthActionState,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    sendPasswordResetAction,
    initialAuthActionState,
  );

  return (
    <div className="space-y-5">
      <form action={passwordAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <label className="block space-y-1 text-sm font-medium">
          <span>Email</span>
          <input
            required
            autoComplete="email"
            name="email"
            type="email"
            className="w-full rounded-md border border-ink/15 bg-paper px-3 py-2"
          />
          <FieldError messages={passwordState.fieldErrors?.email} />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          <span>Password</span>
          <input
            required
            autoComplete="current-password"
            minLength={8}
            name="password"
            type="password"
            className="w-full rounded-md border border-ink/15 bg-paper px-3 py-2"
          />
          <FieldError messages={passwordState.fieldErrors?.password} />
        </label>
        <button
          type="submit"
          disabled={passwordPending}
          className="min-h-11 w-full rounded-md bg-kalyna px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {passwordPending ? "Signing in" : "Sign in"}
        </button>
        <FormMessage state={passwordState} />
      </form>

      <div className="border-t border-ink/10 pt-5">
        <form action={magicAction} className="space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <label className="block space-y-1 text-sm font-medium">
            <span>Email for magic link</span>
            <input
              required
              autoComplete="email"
              name="email"
              type="email"
              className="w-full rounded-md border border-ink/15 bg-paper px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={magicPending}
            className="min-h-11 w-full rounded-md border border-ink/20 px-4 py-2 font-medium disabled:opacity-60"
          >
            {magicPending ? "Sending link" : "Send magic link"}
          </button>
          <FormMessage state={magicState} />
        </form>
      </div>

      <details className="border-t border-ink/10 pt-5">
        <summary className="cursor-pointer text-sm font-medium underline-offset-4 hover:underline">
          Reset password
        </summary>
        <form action={resetAction} className="mt-3 space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <label className="block space-y-1 text-sm font-medium">
            <span>Staff email</span>
            <input
              required
              autoComplete="email"
              name="email"
              type="email"
              className="w-full rounded-md border border-ink/15 bg-paper px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={resetPending}
            className="min-h-11 w-full rounded-md border border-ink/20 px-4 py-2 font-medium disabled:opacity-60"
          >
            {resetPending ? "Sending reset" : "Send reset email"}
          </button>
          <FormMessage state={resetState} />
        </form>
      </details>
    </div>
  );
}

function FieldError({ messages }: { messages?: string[] }): React.ReactNode {
  if (!messages?.length) return null;
  return <span className="text-sm text-kalyna">{messages[0]}</span>;
}

function FormMessage({ state }: { state: AuthActionState }): React.ReactNode {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={
        state.status === "error" ? "text-sm text-kalyna" : "text-sm text-ink/70"
      }
    >
      {state.message}
    </p>
  );
}
