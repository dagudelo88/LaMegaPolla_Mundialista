import { signOut } from "@/app/actions/auth";
import { getProfile, requireUser } from "@/lib/auth/require-admin";
import { formatProfileRoles } from "@/lib/auth/roles";
import { MyPollSummary } from "@/components/dashboard/my-poll-summary";
import { BugReportForm } from "@/components/bugs/bug-report-form";
import { MyBugReports } from "@/components/bugs/my-bug-reports";
import { Button } from "@/components/ui/button";
import { loadChangeAvailability } from "@/lib/changes/load-change-availability";
import { loadUserBugReports } from "@/lib/bugs/load-bug-reports";
import { loadDashboardData } from "@/lib/pool/load-dashboard-data";
import { es } from "@/lib/i18n/es";

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const [dashboardData, changeAvailability, myBugReports] = await Promise.all([
    loadDashboardData(user.id, profile?.username ?? null),
    loadChangeAvailability(user.id),
    loadUserBugReports(user.id).catch(() => []),
  ]);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{es.dashboard.title}</h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          {es.dashboard.welcome},{" "}
          <span className="font-semibold text-[var(--color-accent)]">
            @{profile?.username ?? "..."}
          </span>
        </p>
        <p className="mt-1 text-sm text-[var(--color-accent)]">
          {formatProfileRoles(profile)}
        </p>
      </div>

      <MyPollSummary
        totalPoints={dashboardData.netTotal}
        data={dashboardData}
        changeAvailability={changeAvailability}
      />

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <h2 className="mb-4 text-lg font-semibold">{es.bugReports.sectionTitle}</h2>
        <BugReportForm />
      </div>

      <MyBugReports reports={myBugReports} />

      <form action={signOut}>
        <Button type="submit" variant="outline">
          {es.nav.logout}
        </Button>
      </form>
    </section>
  );
}
