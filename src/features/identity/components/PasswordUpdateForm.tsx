"use client";

import { useActionState } from "react";
import {
  updatePasswordAction,
  type AuthActionState,
} from "@/features/identity/authActions";

const initialAuthActionState: AuthActionState = {
  status: "idle",
  message: "",
};

type PasswordUpdateFormProps = {
  locale: string;
};

export function PasswordUpdateForm({
  locale,
}: PasswordUpdateFormProps): React.ReactNode {
  const [state, action, pending] = useActionState(
    updatePasswordAction,
    initialAuthActionState,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <label className="block space-y-1 text-sm font-medium">
        <span>New password</span>
        <input
          required
          autoComplete="new-password"
          minLength={8}
          name="password"
          type="password"
          className="w-full rounded-md border border-ink/15 bg-paper px-3 py-2"
        />
        <FieldError messages={state.fieldErrors?.password} />
      </label>
      <label className="block space-y-1 text-sm font-medium">
        <span>Confirm password</span>
        <input
          required
          autoComplete="new-password"
          minLength={8}
          name="confirmPassword"
          type="password"
          className="w-full rounded-md border border-ink/15 bg-paper px-3 py-2"
        />
        <FieldError messages={state.fieldErrors?.confirmPassword} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-md bg-kalyna px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving password" : "Save password"}
      </button>
      {state.message && (
        <p role="status" className="text-sm text-kalyna">
          {state.message}
        </p>
      )}
    </form>
  );
}

function FieldError({ messages }: { messages?: string[] }): React.ReactNode {
  if (!messages?.length) return null;
  return <span className="text-sm text-kalyna">{messages[0]}</span>;
}
