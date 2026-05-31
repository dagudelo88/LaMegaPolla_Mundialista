"use client";

import { useActionState } from "react";
import { updatePasswordAfterRecovery, type UpdatePasswordState } from "@/app/actions/auth";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";

const initial: UpdatePasswordState = {};

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAfterRecovery, initial);

  return (
    <form action={action} className="mx-auto max-w-md space-y-4">
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          {es.join.passwordLabel}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
        />
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          {es.passwordReset.passwordHint}
        </p>
      </div>
      <div>
        <label htmlFor="passwordConfirm" className="mb-1 block text-sm font-medium">
          {es.join.passwordConfirmLabel}
        </label>
        <input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "..." : es.passwordReset.updateSubmit}
      </Button>
    </form>
  );
}
