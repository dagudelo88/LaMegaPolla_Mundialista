"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithPassword, type LoginState } from "@/app/actions/auth";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";

const initial: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(signInWithPassword, initial);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const authError = searchParams.get("error") === "auth" ? es.errors.generic : null;
  const resetSuccess = searchParams.get("reset") === "ok";

  return (
    <form action={action} className="mx-auto max-w-md space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
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
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label htmlFor="password" className="text-sm font-medium">
            {es.login.passwordLabel}
          </label>
          <Link
            href="/recuperar-contrasena"
            className="text-xs font-medium text-[var(--color-accent)] hover:underline"
          >
            {es.login.forgotPassword}
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
        />
      </div>
      {resetSuccess ? (
        <p
          className="rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-2 text-sm text-[var(--color-foreground)]"
          role="status"
        >
          {es.login.resetSuccess}
        </p>
      ) : null}
      {(state.error || authError) && (
        <p className="text-sm text-red-400" role="alert">
          {state.error ?? authError}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "..." : es.login.button}
      </Button>
      <p className="text-center text-sm text-[var(--color-muted-foreground)]">
        {es.login.noAccount}{" "}
        <Link href="/join" className="font-medium text-[var(--color-accent)] hover:underline">
          {es.login.createAccount}
        </Link>
      </p>
    </form>
  );
}
