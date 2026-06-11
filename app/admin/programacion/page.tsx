import Link from "next/link";
import { AdminSchedulePanel } from "@/components/admin/admin-schedule-panel";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseDeadlineOffsetMinutes } from "@/lib/matches/compute-prediction-deadline";
import { es } from "@/lib/i18n/es";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MatchPhase, MatchWithTeams } from "@/types/database";

const MATCH_SELECT =
  "id, fifa_match_number, phase, group_letter, home_team_id, away_team_id, home_source, away_source, kickoff_at, fifa_schedule_date, prediction_deadline, status, venue, matchday_key, home_score, away_score, result_advances_team_id";

export default async function AdminProgramacionPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: teams }, { data: matchesRaw }, { data: offsetRow }] = await Promise.all([
    admin
      .from("teams")
      .select("*")
      .order("group_letter")
      .order("fifa_code"),
    admin.from("matches").select(MATCH_SELECT).order("fifa_match_number"),
    admin
      .from("app_config")
      .select("value")
      .eq("key", "tournament.deadline_offset_minutes")
      .maybeSingle(),
  ]);

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));
  const matches: MatchWithTeams[] = (matchesRaw ?? []).map((m) => ({
    ...m,
    phase: m.phase as MatchPhase,
    home_team: m.home_team_id ? teamMap.get(m.home_team_id) ?? null : null,
    away_team: m.away_team_id ? teamMap.get(m.away_team_id) ?? null : null,
  }));

  const deadlineOffsetMinutes = parseDeadlineOffsetMinutes(offsetRow?.value);

  return (
    <section className="space-y-6">
      <nav className="text-sm text-[var(--color-muted-foreground)]">
        <Link href="/admin" className="hover:text-[var(--color-accent)]">
          {es.admin.title}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--color-foreground)]">{es.admin.scheduleTitle}</span>
      </nav>

      <header>
        <h1 className="text-3xl font-bold">{es.admin.scheduleTitle}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-foreground)]">
          {es.admin.scheduleSubtitle}
        </p>
      </header>

      <AdminSchedulePanel matches={matches} deadlineOffsetMinutes={deadlineOffsetMinutes} />
    </section>
  );
}
