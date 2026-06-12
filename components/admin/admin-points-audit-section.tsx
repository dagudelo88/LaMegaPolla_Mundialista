"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  recalculateAllPlayerPoints,
  recalculatePlayerPoints,
} from "@/app/actions/admin";
import { AdminAdvancementBonusTable } from "@/components/admin/admin-advancement-bonus-table";
import { AdminPlayerMatchPointsTable } from "@/components/admin/admin-player-match-points-table";
import { AdminPlayerPointsLedger } from "@/components/admin/admin-player-points-ledger";
import {
  AdminPlayerPicker,
  type AdminPlayerOption,
} from "@/components/admin/admin-player-picker";
import type { PlayerPointsAudit } from "@/lib/admin/load-player-points-audit";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";

interface AdminPointsAuditSectionProps {
  participants: AdminPlayerOption[];
  selectedPlayerId?: string;
  audit?: PlayerPointsAudit | null;
}

export function AdminPointsAuditSection({
  participants,
  selectedPlayerId,
  audit,
}: AdminPointsAuditSectionProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDiscrepancies =
    audit != null &&
    (!audit.summary.isBalanced ||
      audit.matchRows.some((r) => r.delta !== 0) ||
      audit.advancementRows.some((r) => r.delta !== 0) ||
      audit.jornadaRows.some((r) => r.delta !== 0));

  async function handleRecalcPlayer() {
    if (!selectedPlayerId) return;
    setPending(true);
    setError(null);
    try {
      await recalculatePlayerPoints(selectedPlayerId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.admin.errorGeneric);
    } finally {
      setPending(false);
    }
  }

  async function handleRecalcAll() {
    if (!window.confirm(es.admin.pointsAudit.recalcAllConfirm)) return;
    setPending(true);
    setError(null);
    try {
      await recalculateAllPlayerPoints();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.admin.errorGeneric);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPlayerPicker
        participants={participants}
        selectedId={selectedPlayerId ?? ""}
        basePath="/admin/puntos"
        hashAnchor=""
      />

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {hasDiscrepancies && (
        <div className="flex flex-wrap gap-2">
          {selectedPlayerId && (
            <Button size="sm" disabled={pending} onClick={handleRecalcPlayer}>
              {es.admin.pointsAudit.recalcPlayer}
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={pending} onClick={handleRecalcAll}>
            {es.admin.pointsAudit.recalcAll}
          </Button>
        </div>
      )}

      {audit && selectedPlayerId && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SummaryCard label={es.admin.pointsAudit.summaryMatch} value={audit.summary.matchEarned} />
            <SummaryCard
              label={es.admin.pointsAudit.summaryAdvancement}
              value={audit.summary.advancementBonus}
            />
            <SummaryCard label={es.admin.pointsAudit.summaryJornada} value={audit.summary.jornadaBonus} />
            <SummaryCard
              label={es.admin.pointsAudit.summarySpent}
              value={-audit.summary.spent}
              negative
            />
            <SummaryCard label={es.admin.pointsAudit.summaryNet} value={audit.summary.computedNet} />
            <SummaryCard
              label={es.admin.pointsAudit.summaryProfile}
              value={audit.summary.profileTotal}
              badge={
                audit.summary.isBalanced
                  ? es.admin.pointsAudit.balanceOk
                  : es.admin.pointsAudit.balanceError
              }
              badgeOk={audit.summary.isBalanced}
            />
          </div>

          <AdminPlayerMatchPointsTable rows={audit.matchRows} userId={selectedPlayerId} />
          <AdminAdvancementBonusTable rows={audit.advancementRows} />
          <AdminPlayerPointsLedger ledger={audit.ledger} />
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  negative,
  badge,
  badgeOk,
}: {
  label: string;
  value: number;
  negative?: boolean;
  badge?: string;
  badgeOk?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-center">
      <p className="text-sm text-[var(--color-muted-foreground)]">{label}</p>
      <p
        className={`text-2xl font-bold tabular-nums ${
          negative ? "text-red-500" : "text-[var(--color-primary)]"
        }`}
      >
        {value}
      </p>
      {badge && (
        <p
          className={`mt-1 text-xs font-medium ${
            badgeOk ? "text-emerald-600" : "text-red-500"
          }`}
        >
          {badge}
        </p>
      )}
    </div>
  );
}
