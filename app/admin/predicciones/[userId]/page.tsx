import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserPrediccionesRedirect({ params }: PageProps) {
  const { userId } = await params;
  redirect(`/admin?jugador=${userId}#corregir-pronosticos`);
}
