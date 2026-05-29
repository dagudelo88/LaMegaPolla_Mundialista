"use client";

import { useActionState } from "react";
import { redeemInvite, type JoinState } from "@/app/actions/join";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";

const initial: JoinState = {};

export function JoinForm() {
  const [state, action, pending] = useActionState(redeemInvite, initial);

  return (
    <form action={action} className="mx-auto max-w-md space-y-4">
      <div>
        <label htmlFor="code" className="mb-1 block text-sm font-medium">
          {es.join.codeLabel}
        </label>
        <input
          id="code"
          name="code"
          required
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
          placeholder="MEGA-XXXXXX"
        />
      </div>
      <div>
        <label htmlFor="username" className="mb-1 block text-sm font-medium">
          {es.join.usernameLabel}
        </label>
        <input
          id="username"
          name="username"
          required
          minLength={3}
          maxLength={24}
          pattern="[a-zA-Z0-9_]+"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
          placeholder="tu_apodo"
        />
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          {es.join.usernameHint}
        </p>
      </div>
      {state.error && (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "..." : es.join.submit}
      </Button>
    </form>
  );
}
