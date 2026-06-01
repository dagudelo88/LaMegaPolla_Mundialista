"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  setParticipantEntryFeePaid,
  withdrawParticipant,
} from "@/app/actions/admin";
import {
  type AdminParticipantRow,
  isRegisteredParticipant,
} from "@/lib/admin/load-participants";
import { formatProfileRoles } from "@/lib/auth/roles";
import { effectiveEntryFeePaid } from "@/lib/participants/is-active-participant";
import { formatAppDateTime } from "@/lib/matches/format-datetime";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";

interface AdminParticipantsTableProps {
  participants: AdminParticipantRow[];
}

const CHECKMARK_STYLE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E")`,
  backgroundSize: "0.85rem",
} as const;

function PredictionStatusIndicator({ submitted }: { submitted: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-5 shrink-0 rounded border-2 bg-center bg-no-repeat ${
        submitted
          ? "border-green-600 bg-green-600"
          : "border-red-500 bg-red-500/20"
      }`}
      style={submitted ? CHECKMARK_STYLE : undefined}
    />
  );
}

export function AdminParticipantsTable({ participants }: AdminParticipantsTableProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePaidToggle(userId: string, paid: boolean) {
    setPendingId(userId);
    setError(null);
    try {
      await setParticipantEntryFeePaid(userId, paid);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.admin.participantActionError);
    } finally {
      setPendingId(null);
    }
  }

  async function handleWithdraw(userId: string, label: string) {
    if (!window.confirm(es.admin.participantWithdrawConfirm.replace("{user}", label))) {
      return;
    }

    setPendingId(userId);
    setError(null);
    try {
      await withdrawParticipant(userId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.admin.participantActionError);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <h2 className="text-lg font-semibold">{es.admin.users}</h2>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {es.admin.participantsHint}
      </p>

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {participants.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
          {es.admin.noParticipants}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="py-2 pr-4">{es.admin.participantColumn}</th>
                <th className="py-2 pr-4">{es.admin.participantEmailColumn}</th>
                <th className="py-2 pr-4">{es.landing.leaderboardPoints}</th>
                <th className="py-2 pr-4">{es.admin.participantPredictionColumn}</th>
                <th className="py-2 pr-4">{es.admin.participantPaidColumn}</th>
                <th className="py-2">{es.admin.participantActionsColumn}</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => {
                const registered = isRegisteredParticipant(p);
                const isWithdrawn = p.withdrawn_at != null;
                const isPendingAction = pendingId === p.id;
                const paid = effectiveEntryFeePaid(p);
                const submitted = p.predictions_submitted;
                const canTogglePaid = registered && !p.is_admin && !isWithdrawn;
                const canWithdraw = registered && !p.is_admin && !isWithdrawn && !paid;
                const displayName = p.username
                  ? `@${p.username}`
                  : p.email ?? p.id.slice(0, 8);

                return (
                  <tr key={p.id} className="border-b border-[var(--color-border)]">
                    <td className="py-3 pr-4">
                      {registered && p.username ? (
                        <Link
                          href={`/admin?jugador=${p.id}#corregir-pronosticos`}
                          className="font-medium hover:text-[var(--color-accent)] hover:underline"
                        >
                          @{p.username}
                        </Link>
                      ) : (
                        <span className="font-medium">{displayName}</span>
                      )}
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {!registered ? (
                          <span className="font-medium text-sky-300">
                            {es.admin.participantIncompleteBadge}
                          </span>
                        ) : (
                          formatProfileRoles(p)
                        )}
                        {registered && isWithdrawn && (
                          <span className="ml-2 font-medium text-red-600 dark:text-red-400">
                            · {es.admin.participantWithdrawnBadge}
                          </span>
                        )}
                        {registered && !isWithdrawn && !paid && (
                          <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                            · {es.admin.participantUnpaidBadge}
                          </span>
                        )}
                        {registered && !isWithdrawn && p.is_admin && (
                          <span className="ml-2 font-medium text-green-700 dark:text-green-400">
                            · {es.admin.participantAdminPaidBadge}
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-muted-foreground)]">
                      {p.email ?? (
                        <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {registered ? p.total_points : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {!registered ? (
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          {es.admin.participantPredictionIncomplete}
                        </span>
                      ) : (
                        <div className="inline-flex items-start gap-2.5">
                          <PredictionStatusIndicator submitted={submitted} />
                          <div>
                            <span
                              className={`font-medium ${
                                submitted
                                  ? "text-green-700 dark:text-green-400"
                                  : "text-red-700 dark:text-red-400"
                              }`}
                            >
                              {submitted
                                ? es.admin.participantPredictionYes
                                : es.admin.participantPredictionNo}
                            </span>
                            {submitted && p.predictions_submitted_at && (
                              <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                                {formatAppDateTime(p.predictions_submitted_at)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {!registered ? (
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          {es.admin.participantIncompletePaid}
                        </span>
                      ) : (
                        <label
                          className={`inline-flex items-center gap-2.5 ${
                            canTogglePaid ? "cursor-pointer" : "cursor-default opacity-80"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={paid}
                            disabled={!canTogglePaid || isPendingAction}
                            onChange={(e) => handlePaidToggle(p.id, e.target.checked)}
                            aria-label={
                              paid ? es.admin.participantPaidYes : es.admin.participantPaidNo
                            }
                            className={`size-5 shrink-0 appearance-none rounded border-2 bg-center bg-no-repeat transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                              paid
                                ? "border-green-600 bg-green-600 focus-visible:outline-green-600/50"
                                : "border-red-500 bg-red-500/20 focus-visible:outline-red-500/50"
                            }`}
                            style={
                              paid
                                ? {
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E")`,
                                    backgroundSize: "0.85rem",
                                  }
                                : undefined
                            }
                          />
                          <span
                            className={`font-medium ${
                              paid
                                ? "text-green-700 dark:text-green-400"
                                : "text-red-700 dark:text-red-400"
                            }`}
                          >
                            {paid
                              ? p.is_admin
                                ? es.admin.participantAdminPaidLabel
                                : es.admin.participantPaidYes
                              : es.admin.participantPaidNo}
                          </span>
                        </label>
                      )}
                    </td>
                    <td className="py-3">
                      {canWithdraw ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPendingAction}
                          onClick={() => handleWithdraw(p.id, displayName)}
                          className="border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-300"
                        >
                          {es.admin.participantWithdraw}
                        </Button>
                      ) : (
                        <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export type { AdminParticipantRow };
