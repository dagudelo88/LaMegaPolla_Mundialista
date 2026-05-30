import Link from "next/link";
import { Suspense } from "react";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { getProfile, requireUser } from "@/lib/auth/require-admin";
import { isAdminProfile } from "@/lib/auth/roles";
import { notFound } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!isAdminProfile(profile)) notFound();
  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <AdminSubnav />
      </Suspense>
      {children}
    </div>
  );
}
