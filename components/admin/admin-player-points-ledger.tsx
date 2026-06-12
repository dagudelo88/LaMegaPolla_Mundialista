import type { PointsLedgerEntry } from "@/lib/admin/load-player-points-audit";
import { es } from "@/lib/i18n/es";
import { formatAppDateTime } from "@/lib/matches/format-datetime";

interface AdminPlayerPointsLedgerProps {
  ledger: PointsLedgerEntry[];
}

const TYPE_LABELS: Record<PointsLedgerEntry["type"], string> = {
  match: es.admin.pointsAudit.ledgerMatch,
  match_advancement: es.admin.pointsAudit.ledgerMatchAdvancement,
  round_advancement: es.admin.pointsAudit.ledgerRoundAdvancement,
  jornada_bonus: es.admin.pointsAudit.ledgerJornada,
  paid_change: es.admin.pointsAudit.ledgerPaidChange,
  gate_skip: es.admin.pointsAudit.ledgerGateSkip,
};

export function AdminPlayerPointsLedger({ ledger }: AdminPlayerPointsLedgerProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <h2 className="text-lg font-semibold">{es.admin.pointsAudit.ledgerTitle}</h2>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {es.admin.pointsAudit.ledgerHint}
      </p>

      {ledger.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
          {es.admin.pointsAudit.ledgerEmpty}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                <th className="py-2 pr-3">{es.admin.pointsAudit.ledgerDate}</th>
                <th className="py-2 pr-3">{es.admin.pointsAudit.ledgerType}</th>
                <th className="py-2 pr-3">{es.admin.pointsAudit.ledgerDescription}</th>
                <th className="py-2 pr-3 text-right">{es.admin.pointsAudit.ledgerDelta}</th>
                <th className="py-2 text-right">{es.admin.pointsAudit.ledgerBalance}</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row, idx) => (
                <tr key={`${row.sortKey}-${idx}`} className="border-b border-[var(--color-border)]">
                  <td className="py-2 pr-3 whitespace-nowrap text-[var(--color-muted-foreground)]">
                    {row.timestamp && !row.timestamp.startsWith("round-")
                      ? formatAppDateTime(row.timestamp)
                      : "—"}
                  </td>
                  <td className="py-2 pr-3">{TYPE_LABELS[row.type]}</td>
                  <td className="py-2 pr-3">{row.label}</td>
                  <td
                    className={`py-2 pr-3 text-right font-semibold tabular-nums ${
                      row.delta > 0 ? "text-[var(--color-primary)]" : row.delta < 0 ? "text-red-500" : ""
                    }`}
                  >
                    {row.delta > 0 ? `+${row.delta}` : row.delta}
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums">{row.runningBalance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
