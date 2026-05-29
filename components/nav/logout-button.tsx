"use client";

import { signOut } from "@/app/actions/auth";
import { es } from "@/lib/i18n/es";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function LogoutButton({ className }: Props) {
  return (
    <form action={signOut} className="inline">
      <button
        type="submit"
        className={cn(
          "text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:text-red-400",
          className
        )}
      >
        {es.nav.logout}
      </button>
    </form>
  );
}
