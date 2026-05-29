import Link from "next/link";
import { ScheduleView } from "@/components/fixture/schedule-view";
import { loadOfficialFixture } from "@/lib/matches/load-fixture";
import { es } from "@/lib/i18n/es";

export default async function ProgramacionPage() {
  const { matches } = await loadOfficialFixture();

  return (
    <section className="space-y-6">
      <nav className="text-sm text-[var(--color-muted-foreground)]">
        <Link href="/" className="hover:text-[var(--color-accent)]">
          {es.nav.home}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--color-foreground)]">{es.nav.schedule}</span>
      </nav>

      <header>
        <p className="text-sm font-medium uppercase tracking-widest text-[var(--color-primary)]">
          Mundial 2026
        </p>
        <h1 className="mt-2 text-3xl font-bold">{es.fixture.scheduleTitle}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-foreground)]">
          {es.fixture.scheduleSubtitle}
        </p>
      </header>

      <ScheduleView matches={matches} />
    </section>
  );
}
