"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { cn } from "@/lib/utils";

const links = [
  {
    href: "/admin",
    label: es.admin.title,
    match: (path: string, jugador: string | null) => path === "/admin" && !jugador,
  },
  {
    href: "/admin/resultados",
    label: es.admin.resultsTitle,
    match: (path: string) => path.startsWith("/admin/resultados"),
  },
  {
    href: "/admin#corregir-pronosticos",
    label: es.admin.predictionsLink,
    match: (path: string, jugador: string | null) =>
      path.startsWith("/admin/predicciones") || (path === "/admin" && !!jugador),
  },
] as const;

export function AdminSubnav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const jugador = searchParams.get("jugador");

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3"
      aria-label="Secciones de administración"
    >
      {links.map((link) => {
        const active = link.match(pathname, jugador);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            )}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
