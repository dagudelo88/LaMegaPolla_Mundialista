import { notFound } from "next/navigation";
import { getProfile, requireUser } from "@/lib/auth/require-admin";
import { isAdminProfile } from "@/lib/auth/roles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!isAdminProfile(profile)) notFound();
  return <>{children}</>;
}
