"use client";

import { useMemo, useState } from "react";
import { FixtureMatchRow } from "@/components/fixture/fixture-match-row";
import { matchToFixtureSides } from "@/lib/matches/fixture-sides";
import { formatFifaScheduleDateHeader, getFifaScheduleDateKey } from "@/lib/matches/format-datetime";
import { es } from "@/lib/i18n/es";
import { PHASE_LABELS, type MatchPhase, type MatchWithTeams } from "@/types/database";

type PhaseFilter = "all" | MatchPhase;

const KNOCKOUT_PHASES: MatchPhase[] = [
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
];

interface ScheduleViewProps {
  matches: MatchWithTeams[];
}

export function ScheduleView({ matches }: ScheduleViewProps) {
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all");

  const filtered = useMemo(() => {
    let list = matches;
    if (phaseFilter === "group_stage") {
      list = matches.filter((m) => m.phase === "group_stage");
    } else if (phaseFilter !== "all") {
      list = matches.filter((m) => m.phase === phaseFilter);
    }
    return [...list].sort(
      (a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
    );
  }, [matches, phaseFilter]);

  const byDate = useMemo(() => {
    const map = new Map<string, MatchWithTeams[]>();
    for (const match of filtered) {
      const key = getFifaScheduleDateKey(match);
      const list = map.get(key) ?? [];
      list.push(match);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const phaseTabs: { key: PhaseFilter; label: string }[] = [
    { key: "all", label: es.fixture.filterAll },
    { key: "group_stage", label: es.fixture.filterGroups },
    ...KNOCKOUT_PHASES.map((phase) => ({
      key: phase as PhaseFilter,
      label: PHASE_LABELS[phase],
    })),
  ];

  if (!matches.length) {
    return (
      <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-sm text-[var(--color-muted-foreground)]">
        {es.fixture.noMatches}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {phaseTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setPhaseFilter(tab.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              phaseFilter === tab.key
                ? "bg-[var(--color-accent)] text-white"
                : "border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-accent)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {byDate.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">{es.fixture.noMatchesFilter}</p>
      ) : (
        byDate.map(([dateKey, dayMatches]) => (
          <section key={dateKey}>
            <h2 className="mb-3 text-lg font-semibold">
              {formatFifaScheduleDateHeader(dateKey)}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {dayMatches.map((match) => {
                const sides = matchToFixtureSides(match);
                return (
                  <FixtureMatchRow
                    key={match.id}
                    matchNumber={match.fifa_match_number ?? 0}
                    phase={match.phase}
                    groupLetter={match.group_letter}
                    kickoffAt={match.kickoff_at}
                    venue={match.venue}
                    status={match.status}
                    home={sides.home}
                    away={sides.away}
                    homeScore={match.home_score}
                    awayScore={match.away_score}
                    showScore
                  />
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
