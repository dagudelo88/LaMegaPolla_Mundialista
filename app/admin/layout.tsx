import { notFound } from "next/navigation";
import { getProfile, requireUser } from "@/lib/auth/require-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (profile?.role !== "admin") notFound();
  return <>{children}</>;
}
