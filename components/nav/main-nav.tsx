"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { es } from "@/lib/i18n/es";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/nav/logout-button";

type NavProps = {
  isAuthenticated: boolean;
  inviteComplete: boolean;
  isAdmin: boolean;
  username?: string | null;
};

export function MainNav({
  isAuthenticated,
  inviteComplete,
  isAdmin,
  username,
}: NavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links: { href: string; label: string }[] = [
    { href: "/", label: es.nav.home },
    { href: "/reglas", label: es.nav.rules },
    { href: "/programacion", label: es.nav.schedule },
    { href: "/resultados", label: es.nav.results },
  ];

  if (isAuthenticated && inviteComplete) {
    links.push({ href: "/dashboard", label: es.nav.dashboard });
    links.push({ href: "/pronosticos", label: es.nav.predictions });
    links.push({ href: "/transparencia", label: es.nav.transparency });
    if (isAdmin) {
      links.push({ href: "/admin", label: es.nav.admin });
    }
  } else if (isAuthenticated) {
    links.push({ href: "/join", label: es.nav.completeRegistration });
  } else {
    links.push({ href: "/join", label: es.nav.join });
    links.push({ href: "/login", label: es.nav.login });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="shrink-0 font-bold text-[var(--color-accent)]">
          {es.appName}
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-end gap-4 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "shrink-0 text-sm font-medium transition-colors hover:text-[var(--color-accent)]",
                pathname === l.href && "text-[var(--color-accent)]"
              )}
            >
              {l.label}
            </Link>
          ))}
          {username && (
            <span className="shrink-0 text-sm text-[var(--color-muted-foreground)]">
              @{username}
            </span>
          )}
          {isAuthenticated && <LogoutButton />}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          {isAuthenticated && <LogoutButton />}
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-[var(--color-border)] px-4 py-3 md:hidden">
          <ul className="flex flex-col gap-3">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block py-1 text-sm font-medium"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            {username && (
              <li className="text-sm text-[var(--color-muted-foreground)]">@{username}</li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
