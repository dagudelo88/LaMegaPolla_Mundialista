"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ForgotPasswordState } from "@/app/actions/auth";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";

const initial: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

  if (state.success) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <p className="rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm leading-relaxed">
          {es.passwordReset.forgotSuccess}
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          {es.passwordReset.forgotBackToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mx-auto max-w-md space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          {es.login.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "..." : es.passwordReset.forgotSubmit}
      </Button>
      <p className="text-center text-sm text-[var(--color-muted-foreground)]">
        <Link href="/login" className="font-medium text-[var(--color-accent)] hover:underline">
          {es.passwordReset.forgotBackToLogin}
        </Link>
      </p>
    </form>
  );
}
