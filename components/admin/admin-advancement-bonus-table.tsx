import type { AdvancementAuditRow } from "@/lib/admin/load-player-points-audit";
import { es } from "@/lib/i18n/es";

interface AdminAdvancementBonusTableProps {
  rows: AdvancementAuditRow[];
}

export function AdminAdvancementBonusTable({ rows }: AdminAdvancementBonusTableProps) {
  const visible = rows.filter((r) => r.storedBonus != null || r.expectedBonus > 0);
  if (!visible.length) return null;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <h2 className="text-lg font-semibold">{es.admin.pointsAudit.advancementTitle}</h2>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {es.admin.pointsAudit.advancementHint}
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
              <th className="py-2 pr-2">{es.admin.pointsAudit.advancementType}</th>
              <th className="py-2 pr-2">{es.admin.pointsAudit.ledgerDescription}</th>
              <th
                className="py-2 pr-2 text-right"
                title={es.admin.pointsAudit.storedHint}
              >
                {es.admin.pointsAudit.stored}
              </th>
              <th
                className="py-2 pr-2 text-right"
                title={es.admin.pointsAudit.expectedHint}
              >
                {es.admin.pointsAudit.expected}
              </th>
              <th
                className="py-2 text-right"
                title={es.admin.pointsAudit.differenceHint}
              >
                {es.admin.pointsAudit.difference}
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.bonusKey}
                className={`border-b border-[var(--color-border)] ${
                  row.delta !== 0 ? "bg-red-500/10" : ""
                }`}
              >
                <td className="py-2 pr-2">
                  {row.type === "match"
                    ? es.admin.pointsAudit.advancementTypeMatch
                    : es.admin.pointsAudit.advancementTypeRound}
                </td>
                <td className="py-2 pr-2">{row.label}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{row.storedBonus ?? "—"}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{row.expectedBonus}</td>
                <td
                  className={`py-2 text-right tabular-nums ${
                    row.delta !== 0 ? "font-semibold text-red-500" : ""
                  }`}
                >
                  {row.delta !== 0 ? row.delta : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
