"use client";

import { useActionState } from "react";
import { redeemInvite, type JoinState } from "@/app/actions/join";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";

const initial: JoinState = {};

const inputClass =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2";

export function RedeemForm() {
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
          className={inputClass}
          placeholder="MEGA-XXXXXX"
        />
      </div>
      <fieldset className="space-y-3 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-card)]/50 p-4">
        <legend className="px-1 text-sm font-semibold text-[var(--color-accent)]">
          {es.join.nicknameSection}
        </legend>
        <div>
          <label htmlFor="nickname" className="mb-1 block text-sm font-medium">
            {es.join.nicknameLabel} <span className="text-red-400">*</span>
          </label>
          <input
            id="nickname"
            name="nickname"
            required
            minLength={3}
            maxLength={24}
            pattern="[a-zA-Z0-9_]+"
            autoComplete="username"
            className={inputClass}
            placeholder={es.join.nicknamePlaceholder}
            aria-describedby="nickname-hint-redeem"
          />
          <p
            id="nickname-hint-redeem"
            className="mt-1 text-xs text-[var(--color-muted-foreground)]"
          >
            {es.join.nicknameHint}
          </p>
        </div>
      </fieldset>
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
