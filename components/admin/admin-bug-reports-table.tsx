"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateBugReportStatus } from "@/app/actions/admin-bug-reports";
import type { BugReportRow, BugReportStatus } from "@/lib/bugs/types";
import { formatAppDateTime } from "@/lib/matches/format-datetime";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminBugReportsTableProps {
  reports: BugReportRow[];
  currentFilter: BugReportStatus | "all";
}

const STATUS_LABELS: Record<BugReportStatus, string> = {
  open: es.admin.bugReports.statusOpen,
  reviewing: es.admin.bugReports.statusReviewing,
  resolved: es.admin.bugReports.statusResolved,
  closed: es.admin.bugReports.statusClosed,
};

const STATUS_BADGE: Record<BugReportStatus, string> = {
  open: "bg-amber-500/20 text-amber-200",
  reviewing: "bg-sky-500/20 text-sky-200",
  resolved: "bg-emerald-500/20 text-emerald-200",
  closed: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
};

const FILTERS: Array<{ value: BugReportStatus | "all"; label: string }> = [
  { value: "all", label: es.admin.bugReports.filterAll },
  { value: "open", label: es.admin.bugReports.filterOpen },
  { value: "reviewing", label: es.admin.bugReports.filterReviewing },
  { value: "resolved", label: es.admin.bugReports.filterResolved },
  { value: "closed", label: es.admin.bugReports.filterClosed },
];

export function AdminBugReportsTable({ reports, currentFilter }: AdminBugReportsTableProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function handleUpdate(reportId: string, status: BugReportStatus) {
    setPendingId(reportId);
    setError(null);
    try {
      await updateBugReportStatus(reportId, status, notes[reportId]);
      router.refresh();
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "admin_note_required") {
        setError(es.admin.bugReports.adminNoteRequired);
      } else {
        setError(es.admin.bugReports.actionError);
      }
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const href =
            filter.value === "all" ? "/admin/reportes" : `/admin/reportes?estado=${filter.value}`;
          const active = currentFilter === filter.value;
          return (
            <Link
              key={filter.value}
              href={href}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {reports.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">{es.admin.bugReports.empty}</p>
      ) : (
        <ul className="space-y-4">
          {reports.map((report) => {
            const isPending = pendingId === report.id;
            const noteValue = notes[report.id] ?? report.admin_note ?? "";

            return (
              <li
                key={report.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {formatAppDateTime(report.created_at)}
                    </p>
                    <p className="font-medium">
                      {report.username ? `@${report.username}` : report.user_id.slice(0, 8)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      STATUS_BADGE[report.status]
                    )}
                  >
                    {STATUS_LABELS[report.status]}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm">{report.description}</p>

                <div className="mt-4 space-y-2">
                  <label
                    htmlFor={`admin-note-${report.id}`}
                    className="block text-xs font-medium text-[var(--color-muted-foreground)]"
                  >
                    {es.admin.bugReports.adminNoteLabel}
                  </label>
                  <textarea
                    id={`admin-note-${report.id}`}
                    value={noteValue}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [report.id]: e.target.value }))
                    }
                    rows={2}
                    placeholder={es.admin.bugReports.adminNotePlaceholder}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {report.status !== "reviewing" && report.status !== "resolved" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleUpdate(report.id, "reviewing")}
                    >
                      {es.admin.bugReports.markReviewing}
                    </Button>
                  )}
                  {report.status !== "resolved" && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleUpdate(report.id, "resolved")}
                    >
                      {es.admin.bugReports.markResolved}
                    </Button>
                  )}
                  {report.status !== "closed" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleUpdate(report.id, "closed")}
                    >
                      {es.admin.bugReports.markClosed}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
