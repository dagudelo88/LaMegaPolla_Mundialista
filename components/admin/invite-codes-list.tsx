"use client";

import { ChevronDown } from "lucide-react";
import { CopyInviteCodeButton } from "@/components/admin/copy-invite-code-button";
import { PoolStatCard } from "@/components/home/pool-cards";
import type { InviteCodeRow } from "@/lib/admin/load-invite-codes";
import { es } from "@/lib/i18n/es";

export type { InviteCodeRow } from "@/lib/admin/load-invite-codes";

interface InviteCodesListProps {
  totalGenerated: number;
  totalUsed: number;
  available: InviteCodeRow[];
  used: InviteCodeRow[];
}

function InviteCodeItem({ code, uses_count, max_uses, showStatus }: InviteCodeRow & { showStatus?: boolean }) {
  const exhausted = uses_count >= max_uses;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] py-2">
      <div className="min-w-0">
        <span className="break-all">{code}</span>
        {showStatus ? (
          <span className="ml-2 text-xs text-[var(--color-muted-foreground)]">
            {uses_count}/{max_uses}
            {exhausted ? ` · ${es.admin.inviteExhausted}` : ""}
          </span>
        ) : null}
      </div>
      {!exhausted ? <CopyInviteCodeButton code={code} /> : null}
    </li>
  );
}

export function InviteCodesList({
  totalGenerated,
  totalUsed,
  available,
  used,
}: InviteCodesListProps) {
  if (totalGenerated === 0) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">{es.admin.noCodes}</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <PoolStatCard
          label={es.admin.inviteStatGenerated}
          value={String(totalGenerated)}
        />
        <PoolStatCard
          label={es.admin.inviteStatUsed}
          value={String(totalUsed)}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold">{es.admin.inviteAvailableTitle}</h3>
        {available.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            {es.admin.inviteNoAvailable}
          </p>
        ) : (
          <ul className="mt-2 space-y-2 font-mono text-sm">
            {available.map((c) => (
              <InviteCodeItem key={c.code} {...c} showStatus />
            ))}
          </ul>
        )}
      </div>

      {used.length > 0 ? (
        <details className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/30">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
            <span>
              {es.admin.inviteUsedSection} ({used.length})
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <ul className="space-y-2 border-t border-[var(--color-border)] px-4 py-3 font-mono text-sm">
            {used.map((c) => (
              <InviteCodeItem key={c.code} {...c} showStatus />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
