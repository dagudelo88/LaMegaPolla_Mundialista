import { Suspense } from "react";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { getProfile, requireUser } from "@/lib/auth/require-admin";
import { isAdminProfile } from "@/lib/auth/roles";
import { countOpenBugReports } from "@/lib/bugs/load-bug-reports";
import { notFound } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!isAdminProfile(profile)) notFound();

  let openReportCount = 0;
  try {
    openReportCount = await countOpenBugReports();
  } catch {
    openReportCount = 0;
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <AdminSubnav openReportCount={openReportCount} />
      </Suspense>
      {children}
    </div>
  );
}
