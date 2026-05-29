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

function TeamSide({ team, align }: { team: FixtureTeamSide; align: "left" | "right" }) {
  if (team.fifa_code) {
    return (
      <TeamWithFlag
        name={team.name_es}
        fifaCode={team.fifa_code}
        align={align}
        flagSize="sm"
      />
    );
  }

  return (
    <div
      className={`flex flex-col gap-1 ${align === "right" ? "items-end text-right" : "items-start text-left"}`}
    >
      <p className="max-w-[9rem] text-sm font-medium leading-tight text-[var(--color-muted-foreground)]">
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
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted-foreground)]">
        <span>
          {es.fixture.matchNumber} {matchNumber}
          {groupLetter ? ` · Grupo ${groupLetter}` : ` · ${PHASE_LABELS[phase]}`}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass(status)}`}
        >
          {statusLabel(status)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamSide team={home} align="left" />

        <div className="text-center">
          {hasScore ? (
            <p className="text-2xl font-bold tabular-nums">
              {homeScore}
              <span className="mx-1 text-[var(--color-muted-foreground)]">-</span>
              {awayScore}
            </p>
          ) : (
            <p className="text-sm font-semibold text-[var(--color-muted-foreground)]">
              {formatMatchTime(kickoffAt)}
            </p>
          )}
        </div>

        <TeamSide team={away} align="right" />
      </div>

      {venue && (
        <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">{venue}</p>
      )}
    </article>
  );
}
