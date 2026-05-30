import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ jugador?: string }>;
}

export default async function AdminPrediccionesRedirect({ searchParams }: PageProps) {
  const { jugador } = await searchParams;
  const query = jugador ? `?jugador=${jugador}` : "";
  redirect(`/admin${query}#corregir-pronosticos`);
}
