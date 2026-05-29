import Link from "next/link";
import { ReglasContent, reglasTitle } from "@/components/reglas/reglas-content";
import { loadReglasMarkdown } from "@/lib/reglas/load-reglas";
import { es } from "@/lib/i18n/es";

export default async function ReglasPage() {
  const markdown = await loadReglasMarkdown();

  return (
    <section className="mx-auto max-w-4xl pb-12">
      <nav className="mb-6 text-sm text-[var(--color-muted-foreground)]">
        <Link href="/" className="hover:text-[var(--color-accent)]">
          {es.nav.home}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--color-foreground)]">{es.nav.rules}</span>
      </nav>

      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-widest text-[var(--color-primary)]">
          Mundial 2026
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--color-foreground)] md:text-4xl">
          {reglasTitle(markdown)}
        </h1>
      </header>

      <ReglasContent markdown={markdown} />
    </section>
  );
}
