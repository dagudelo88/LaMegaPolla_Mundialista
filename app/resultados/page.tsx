import Link from "next/link";
import { ResultsView } from "@/components/fixture/results-view";
import { buildOfficialStandings } from "@/lib/matches/build-standings";
import { loadOfficialFixture } from "@/lib/matches/load-fixture";
import { countOfficialResults } from "@/lib/matches/official-results";
import { es } from "@/lib/i18n/es";
import { getConfigBoolean } from "@/lib/config/get-config";

export default async function ResultadosPage() {
  const { teams, matches } = await loadOfficialFixture();
  const {
    groups: standings,
    advancingThirdGroups,
    qualifiedTeams,
  } = buildOfficialStandings(teams, matches);
  const officialQualifiersValidated = await getConfigBoolean(
    "results.official_qualifiers_validated",
    false
  );
  const stats = countOfficialResults(matches);

  return (
    <section className="space-y-6">
      <nav className="text-sm text-[var(--color-muted-foreground)]">
        <Link href="/" className="hover:text-[var(--color-accent)]">
          {es.nav.home}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--color-foreground)]">{es.nav.results}</span>
      </nav>

      <header>
        <p className="text-sm font-medium uppercase tracking-widest text-[var(--color-primary)]">
          Mundial 2026
        </p>
        <h1 className="mt-2 text-3xl font-bold">{es.fixture.resultsTitle}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-foreground)]">
          {es.fixture.resultsSubtitle}
        </p>
      </header>

      <ResultsView
        matches={matches}
        standings={standings}
        advancingThirdGroups={advancingThirdGroups}
        qualifiedTeams={qualifiedTeams}
        officialQualifiersValidated={officialQualifiersValidated}
        stats={stats}
      />
    </section>
  );
}
