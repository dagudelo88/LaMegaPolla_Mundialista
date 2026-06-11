import Link from "next/link";
import { AdminResultsPanel } from "@/components/admin/admin-results-panel";
import { requireAdmin } from "@/lib/auth/require-admin";
import { es } from "@/lib/i18n/es";
import { buildOfficialStandings } from "@/lib/matches/build-standings";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MatchPhase, MatchWithTeams } from "@/types/database";

const MATCH_SELECT =
  "id, fifa_match_number, phase, group_letter, home_team_id, away_team_id, home_source, away_source, kickoff_at, fifa_schedule_date, prediction_deadline, status, venue, matchday_key, home_score, away_score, result_advances_team_id";

export default async function AdminResultadosPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: teams }, { data: matchesRaw }] = await Promise.all([
    admin
      .from("teams")
      .select("*")
      .order("group_letter")
      .order("fifa_code"),
    admin.from("matches").select(MATCH_SELECT).order("fifa_match_number"),
  ]);

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));
  const matches: MatchWithTeams[] = (matchesRaw ?? []).map((m) => ({
    ...m,
    phase: m.phase as MatchPhase,
    home_team: m.home_team_id ? teamMap.get(m.home_team_id) ?? null : null,
    away_team: m.away_team_id ? teamMap.get(m.away_team_id) ?? null : null,
  }));
  const { qualifiedTeams, thirdPlaceTeams } = buildOfficialStandings(teams ?? [], matches);
  const groupStageComplete =
    matches.filter((match) => match.phase === "group_stage").length === 72 &&
    matches
      .filter((match) => match.phase === "group_stage")
      .every(
        (match) =>
          match.status === "finished" &&
          match.home_score != null &&
          match.away_score != null
      );

  return (
    <section className="space-y-6">
      <nav className="text-sm text-[var(--color-muted-foreground)]">
        <Link href="/admin" className="hover:text-[var(--color-accent)]">
          {es.admin.title}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--color-foreground)]">{es.admin.resultsTitle}</span>
      </nav>

      <div className="rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-card)] p-4">
        <p className="text-sm font-medium">{es.admin.resultsNotPredictionsTitle}</p>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {es.admin.resultsNotPredictionsHint}
        </p>
        <Link
          href="/admin#corregir-pronosticos"
          className="mt-3 inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] hover:opacity-90"
        >
          {es.admin.predictionsLink} →
        </Link>
      </div>

      <header>
        <h1 className="text-3xl font-bold">{es.admin.resultsTitle}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-foreground)]">
          {es.admin.resultsSubtitle}
        </p>
      </header>

      <AdminResultsPanel
        matches={matches}
        officialQualifiedTeams={qualifiedTeams}
        officialThirdPlaceTeams={thirdPlaceTeams}
        groupStageComplete={groupStageComplete}
      />
    </section>
  );
}
