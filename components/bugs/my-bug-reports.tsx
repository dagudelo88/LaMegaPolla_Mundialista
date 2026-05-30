import type { BugReportRow } from "@/lib/bugs/types";
import { formatAppDateTime } from "@/lib/matches/format-datetime";
import { es } from "@/lib/i18n/es";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  open: es.bugReports.statusOpen,
  reviewing: es.bugReports.statusReviewing,
  resolved: es.bugReports.statusResolved,
  closed: es.bugReports.statusClosed,
} as const;

const STATUS_BADGE = {
  open: "bg-amber-500/20 text-amber-200",
  reviewing: "bg-sky-500/20 text-sky-200",
  resolved: "bg-emerald-500/20 text-emerald-200",
  closed: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
} as const;

interface MyBugReportsProps {
  reports: BugReportRow[];
}

export function MyBugReports({ reports }: MyBugReportsProps) {
  if (reports.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
      <h2 className="mb-4 text-lg font-semibold">{es.bugReports.myReportsTitle}</h2>
      <ul className="space-y-3">
        {reports.map((report) => (
          <li
            key={report.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {formatAppDateTime(report.created_at)}
              </p>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  STATUS_BADGE[report.status]
                )}
              >
                {STATUS_LABELS[report.status]}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{report.description}</p>
            {report.status === "resolved" && report.admin_note && (
              <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm">
                <span className="font-medium">{es.bugReports.adminResponseLabel}: </span>
                {report.admin_note}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
