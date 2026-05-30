import Link from "next/link";
import { AdminBugReportsTable } from "@/components/admin/admin-bug-reports-table";
import { isBugReportStatus } from "@/lib/bugs/types";
import { loadAdminBugReports } from "@/lib/bugs/load-bug-reports";
import { requireAdmin } from "@/lib/auth/require-admin";
import { es } from "@/lib/i18n/es";

interface PageProps {
  searchParams: Promise<{ estado?: string }>;
}

export default async function AdminBugReportsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { estado } = await searchParams;
  const statusFilter =
    estado && isBugReportStatus(estado) ? estado : ("all" as const);
  const reports = await loadAdminBugReports(statusFilter);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{es.admin.bugReports.title}</h1>
        <p className="max-w-2xl text-sm text-[var(--color-muted-foreground)]">
          {es.admin.bugReports.subtitle}
        </p>
        <Link
          href="/dashboard"
          className="inline-block text-sm text-[var(--color-accent)] hover:underline"
        >
          {es.admin.bugReports.playerFormHint}
        </Link>
      </header>

      <AdminBugReportsTable reports={reports} currentFilter={statusFilter} />
    </section>
  );
}
