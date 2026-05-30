"use client";

import { CopyInviteCodeButton } from "@/components/admin/copy-invite-code-button";
import { es } from "@/lib/i18n/es";

export interface InviteCodeRow {
  code: string;
  uses_count: number;
  max_uses: number;
}

interface InviteCodesListProps {
  codes: InviteCodeRow[];
}

export function InviteCodesList({ codes }: InviteCodesListProps) {
  if (codes.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">{es.admin.noCodes}</p>
    );
  }

  return (
    <ul className="space-y-2 font-mono text-sm">
      {codes.map((c) => {
        const exhausted = c.uses_count >= c.max_uses;

        return (
          <li
            key={c.code}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] py-2"
          >
            <div className="min-w-0">
              <span className="break-all">{c.code}</span>
              <span className="ml-2 text-xs text-[var(--color-muted-foreground)]">
                {c.uses_count}/{c.max_uses}
                {exhausted ? ` · ${es.admin.inviteExhausted}` : ""}
              </span>
            </div>
            <CopyInviteCodeButton code={c.code} />
          </li>
        );
      })}
    </ul>
  );
}
