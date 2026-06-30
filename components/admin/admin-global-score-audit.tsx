import type { ScoreAuditResult } from "@/lib/scoring/audit-scores";
import { es } from "@/lib/i18n/es";

interface AdminGlobalScoreAuditProps {
  audit: ScoreAuditResult;
}

export function AdminGlobalScoreAudit({ audit }: AdminGlobalScoreAuditProps) {
  const matchAdvancementDiscrepancies = audit.advancementDiscrepancies.filter((d) =>
    d.bonusKey.startsWith("match:")
  );
  const roundAdvancementDiscrepancies = audit.advancementDiscrepancies.filter((d) =>
    d.bonusKey.startsWith("round:")
  );

  const hasIssues =
    audit.matchDiscrepancies.length > 0 ||
    audit.gatedDiscrepancies.length > 0 ||
    audit.advancementDiscrepancies.length > 0 ||
    audit.totalDiscrepancies.length > 0;

  const mismatchMatches = audit.summaryByMatch.filter((r) => r.eligible !== r.scored);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{es.admin.pointsAudit.globalTitle}</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {es.admin.pointsAudit.globalHint}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            hasIssues
              ? "bg-red-500/15 text-red-600 dark:text-red-400"
              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {hasIssues ? es.admin.pointsAudit.globalIssues : es.admin.pointsAudit.globalOk}
        </span>
      </div>

      <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
        {es.admin.pointsAudit.finishedMatches}: {audit.finishedMatches}
        {audit.gatedSummaryByPlayer.length > 0 && (
          <span className="ml-2 text-amber-600 dark:text-amber-400">
            · {audit.gatedSummaryByPlayer.length}{" "}
            {es.admin.pointsAudit.gatedPlayersAffected}
          </span>
        )}
        {mismatchMatches.length > 0 && (
          <span className="ml-2 text-red-500">
            · {mismatchMatches.length} {es.admin.pointsAudit.scoringMismatch}
          </span>
        )}
      </p>

      {audit.gatedDiscrepancies.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <h3 className="mb-2 text-sm font-semibold">
            {es.admin.pointsAudit.gatedDiscrepancies}
          </h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">{es.admin.pointsAudit.player}</th>
                <th className="py-2 pr-2">{es.admin.pointsAudit.prediction}</th>
                <th className="py-2 pr-2">{es.admin.pointsAudit.actual}</th>
                <th className="py-2 pr-2 text-right">{es.admin.pointsAudit.stored}</th>
                <th className="py-2 pr-2 text-right">{es.admin.pointsAudit.expected}</th>
                <th className="py-2 text-right">{es.admin.pointsAudit.gatedOverAwarded}</th>
              </tr>
            </thead>
            <tbody>
              {audit.gatedDiscrepancies.slice(0, 50).map((d) => (
                <tr
                  key={`gated-${d.matchId}-${d.userId}`}
                  className="border-b border-[var(--color-border)] bg-amber-500/10"
                >
                  <td className="py-2 pr-2 tabular-nums">{d.fifaMatchNumber}</td>
                  <td className="py-2 pr-2">@{d.username}</td>
                  <td className="py-2 pr-2 font-mono tabular-nums">
                    {d.predictedHome}-{d.predictedAway}
                  </td>
                  <td className="py-2 pr-2 font-mono tabular-nums">
                    {d.actualHome}-{d.actualAway}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">{d.storedPoints ?? "—"}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{d.expectedPoints}</td>
                  <td className="py-2 text-right tabular-nums text-amber-700 dark:text-amber-300">
                    +{d.pointsOverAwarded ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {audit.matchDiscrepancies.filter((d) => d.issue !== "gated_wrong_points").length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <h3 className="mb-2 text-sm font-semibold">{es.admin.pointsAudit.matchDiscrepancies}</h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">{es.admin.pointsAudit.player}</th>
                <th className="py-2 pr-2">{es.admin.pointsAudit.prediction}</th>
                <th className="py-2 pr-2">{es.admin.pointsAudit.actual}</th>
                <th className="py-2 pr-2 text-right" title={es.admin.pointsAudit.storedHint}>
                  {es.admin.pointsAudit.stored}
                </th>
                <th className="py-2 pr-2 text-right" title={es.admin.pointsAudit.expectedHint}>
                  {es.admin.pointsAudit.expected}
                </th>
              </tr>
            </thead>
            <tbody>
              {audit.matchDiscrepancies
                .filter((d) => d.issue !== "gated_wrong_points")
                .slice(0, 50)
                .map((d) => (
                <tr key={`${d.matchId}-${d.userId}`} className="border-b border-[var(--color-border)]">
                  <td className="py-2 pr-2 tabular-nums">{d.fifaMatchNumber}</td>
                  <td className="py-2 pr-2">@{d.username}</td>
                  <td className="py-2 pr-2 font-mono tabular-nums">
                    {d.predictedHome}-{d.predictedAway}
                  </td>
                  <td className="py-2 pr-2 font-mono tabular-nums">
                    {d.actualHome}-{d.actualAway}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">{d.storedPoints ?? "—"}</td>
                  <td className="py-2 pr-2 text-right tabular-nums text-red-500">{d.expectedPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {matchAdvancementDiscrepancies.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <h3 className="mb-2 text-sm font-semibold">
            {es.admin.pointsAudit.advancementMatchDiscrepancies}
          </h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                <th className="py-2 pr-2">{es.admin.pointsAudit.player}</th>
                <th className="py-2 pr-2">Key</th>
                <th className="py-2 pr-2 text-right" title={es.admin.pointsAudit.storedHint}>
                  {es.admin.pointsAudit.stored}
                </th>
                <th className="py-2 text-right" title={es.admin.pointsAudit.expectedHint}>
                  {es.admin.pointsAudit.expected}
                </th>
              </tr>
            </thead>
            <tbody>
              {matchAdvancementDiscrepancies.slice(0, 30).map((d) => (
                <tr key={`${d.userId}-${d.bonusKey}`} className="border-b border-[var(--color-border)]">
                  <td className="py-2 pr-2">@{d.username}</td>
                  <td className="py-2 pr-2 font-mono text-xs">{d.bonusKey}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{d.storedPoints ?? "—"}</td>
                  <td className="py-2 text-right tabular-nums text-red-500">{d.expectedPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {roundAdvancementDiscrepancies.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <h3 className="mb-2 text-sm font-semibold">
            {es.admin.pointsAudit.advancementRoundDiscrepancies}
          </h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                <th className="py-2 pr-2">{es.admin.pointsAudit.player}</th>
                <th className="py-2 pr-2">Key</th>
                <th className="py-2 pr-2 text-right" title={es.admin.pointsAudit.storedHint}>
                  {es.admin.pointsAudit.stored}
                </th>
                <th className="py-2 text-right" title={es.admin.pointsAudit.expectedHint}>
                  {es.admin.pointsAudit.expected}
                </th>
              </tr>
            </thead>
            <tbody>
              {roundAdvancementDiscrepancies.slice(0, 30).map((d) => (
                <tr key={`${d.userId}-${d.bonusKey}`} className="border-b border-[var(--color-border)]">
                  <td className="py-2 pr-2">@{d.username}</td>
                  <td className="py-2 pr-2 font-mono text-xs">{d.bonusKey}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{d.storedPoints ?? "—"}</td>
                  <td className="py-2 text-right tabular-nums text-red-500">{d.expectedPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {audit.totalDiscrepancies.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <h3 className="mb-2 text-sm font-semibold">{es.admin.pointsAudit.totalDiscrepancies}</h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                <th className="py-2 pr-2">{es.admin.pointsAudit.player}</th>
                <th className="py-2 pr-2 text-right" title={es.admin.pointsAudit.summaryProfile}>
                  {es.admin.pointsAudit.summaryProfile}
                </th>
                <th className="py-2 text-right" title={es.admin.pointsAudit.summaryNet}>
                  {es.admin.pointsAudit.summaryNet}
                </th>
              </tr>
            </thead>
            <tbody>
              {audit.totalDiscrepancies.map((d) => (
                <tr key={d.userId} className="border-b border-[var(--color-border)]">
                  <td className="py-2 pr-2">@{d.username}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{d.storedTotal}</td>
                  <td className="py-2 text-right tabular-nums text-red-500">{d.expectedTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
