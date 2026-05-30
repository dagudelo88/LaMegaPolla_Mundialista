"use client";

import { TeamWithFlag } from "@/components/predictions/team-flag";
import { formatMatchTime } from "@/lib/matches/format-datetime";
import type { FixtureTeamSide } from "@/lib/matches/fixture-sides";
import { es } from "@/lib/i18n/es";
import { PHASE_LABELS, type MatchPhase } from "@/types/database";

export type { FixtureTeamSide };
export { matchToFixtureSides } from "@/lib/matches/fixture-sides";

export interface FixtureMatchRowProps {
  matchNumber: number;
  phase: MatchPhase;
  groupLetter?: string | null;
  kickoffAt: string;
  venue: string | null;
  status: string;
  home: FixtureTeamSide;
  away: FixtureTeamSide;
  homeScore?: number | null;
  awayScore?: number | null;
  showScore?: boolean;
}

function statusLabel(status: string): string {
  const labels = es.fixture.status;
  if (status in labels) return labels[status as keyof typeof labels];
  return status;
}

function statusClass(status: string): string {
  switch (status) {
    case "live":
      return "bg-red-500/15 text-red-600";
    case "finished":
      return "bg-green-500/15 text-green-700";
    case "postponed":
    case "cancelled":
      return "bg-amber-500/15 text-amber-700";
    default:
      return "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]";
  }
}

function TeamSide({ team }: { team: FixtureTeamSide }) {
  if (team.fifa_code) {
    return (
      <TeamWithFlag
        name={team.name_es}
        fifaCode={team.fifa_code}
        align="center"
        flagSize="md"
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="max-w-[9rem] text-sm font-medium leading-tight text-[var(--color-muted-foreground)] sm:text-base">
        {team.placeholder ?? team.name_es}
      </p>
    </div>
  );
}

export function FixtureMatchRow({
  matchNumber,
  phase,
  groupLetter,
  kickoffAt,
  venue,
  status,
  home,
  away,
  homeScore,
  awayScore,
  showScore = false,
}: FixtureMatchRowProps) {
  const hasScore =
    showScore &&
    status !== "scheduled" &&
    homeScore != null &&
    awayScore != null;

  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--color-muted-foreground)]">
        <span>
          {es.fixture.matchNumber} {matchNumber}
          {groupLetter ? ` · Grupo ${groupLetter}` : ` · ${PHASE_LABELS[phase]}`}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusClass(status)}`}
        >
          {statusLabel(status)}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex justify-center">
          <TeamSide team={home} />
        </div>

        <div className="min-w-[4.5rem] text-center">
          {hasScore ? (
            <p className="text-2xl font-bold tabular-nums sm:text-3xl">
              {homeScore}
              <span className="mx-1 text-[var(--color-muted-foreground)]">-</span>
              {awayScore}
            </p>
          ) : (
            <p className="text-base font-bold tabular-nums text-[var(--color-foreground)]">
              {formatMatchTime(kickoffAt)}
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <TeamSide team={away} />
        </div>
      </div>

      {venue && (
        <p className="mt-2 text-center text-xs text-[var(--color-muted-foreground)] sm:text-sm">
          {venue}
        </p>
      )}
    </article>
  );
}
