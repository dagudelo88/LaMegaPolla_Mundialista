"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { cn } from "@/lib/utils";

interface AdminSubnavProps {
  openReportCount?: number;
}

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
    href: "/admin/programacion",
    label: es.admin.scheduleTitle,
    match: (path: string) => path.startsWith("/admin/programacion"),
  },
  {
    href: "/admin#corregir-pronosticos",
    label: es.admin.predictionsLink,
    match: (path: string, jugador: string | null) =>
      path.startsWith("/admin/predicciones") || (path === "/admin" && !!jugador),
  },
  {
    href: "/admin/reportes",
    label: es.admin.bugReports.navLabel,
    match: (path: string) => path.startsWith("/admin/reportes"),
    badgeKey: "reports" as const,
  },
] as const;

export function AdminSubnav({ openReportCount = 0 }: AdminSubnavProps) {
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
        const showBadge =
          "badgeKey" in link && link.badgeKey === "reports" && openReportCount > 0;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            )}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
            {showBadge && (
              <span
                className={cn(
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  active
                    ? "bg-[var(--color-primary-foreground)] text-[var(--color-primary)]"
                    : "bg-amber-500 text-black"
                )}
                aria-label={es.admin.bugReports.pendingBadge.replace(
                  "{count}",
                  String(openReportCount)
                )}
              >
                {openReportCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
