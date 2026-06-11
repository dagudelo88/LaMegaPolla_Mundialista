"use client";

import { useMemo, useState } from "react";
import { AdminMatchScheduleForm } from "@/components/admin/admin-match-schedule-form";
import { FixtureMatchRow } from "@/components/fixture/fixture-match-row";
import {
  formatFifaScheduleDateHeader,
  formatMatchTime,
  getFifaScheduleDateKey,
} from "@/lib/matches/format-datetime";
import { matchToFixtureSides } from "@/lib/matches/fixture-sides";
import { es } from "@/lib/i18n/es";
import type { MatchPhase, MatchWithTeams } from "@/types/database";

type PhaseFilter = "all" | "group_stage" | "knockout";

interface AdminSchedulePanelProps {
  matches: MatchWithTeams[];
  deadlineOffsetMinutes: number;
}

function isKnockoutPhase(phase: MatchPhase): boolean {
  return phase !== "group_stage";
}

export function AdminSchedulePanel({
  matches,
  deadlineOffsetMinutes,
}: AdminSchedulePanelProps) {
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = matches;
    if (phaseFilter === "group_stage") {
      list = list.filter((m) => m.phase === "group_stage");
    } else if (phaseFilter === "knockout") {
      list = list.filter((m) => isKnockoutPhase(m.phase as MatchPhase));
    }
    const q = search.trim();
    if (q) {
      const num = Number.parseInt(q, 10);
      if (Number.isFinite(num)) {
        list = list.filter((m) => m.fifa_match_number === num);
      }
    }
    return [...list].sort(
      (a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
    );
  }, [matches, phaseFilter, search]);

  const byDate = useMemo(() => {
    const map = new Map<string, MatchWithTeams[]>();
    for (const match of filtered) {
      const key = getFifaScheduleDateKey(match);
      const list = map.get(key) ?? [];
      list.push(match);
      map.set(key, list);
    }
    for (const [, dayMatches] of map) {
      dayMatches.sort(
        (a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
      );
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const phaseTabs: { key: PhaseFilter; label: string }[] = [
    { key: "all", label: es.admin.filterAll },
    { key: "group_stage", label: es.fixture.filterGroups },
    { key: "knockout", label: es.admin.scheduleKnockoutFilter },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {phaseTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPhaseFilter(tab.key)}
              className={
                phaseFilter === tab.key
                  ? "rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-[var(--color-primary-foreground)]"
                  : "rounded-full bg-[var(--color-muted)] px-4 py-1.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-muted-foreground)]">
            {es.admin.scheduleSearchLabel}
          </span>
          <input
            type="search"
            inputMode="numeric"
            placeholder={es.admin.scheduleSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-40 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5"
          />
        </label>
      </div>

      {byDate.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {es.admin.noMatchesFilter}
        </p>
      ) : (
        byDate.map(([dateKey, dayMatches]) => (
          <section key={dateKey} className="space-y-3">
            <h2 className="text-lg font-semibold">{formatFifaScheduleDateHeader(dateKey)}</h2>
            <div className="space-y-3">
              {dayMatches.map((match) => {
                const { home, away } = matchToFixtureSides(match);
                return (
                  <article
                    key={match.id}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
                  >
                    <FixtureMatchRow
                      matchNumber={match.fifa_match_number ?? 0}
                      phase={match.phase as MatchPhase}
                      groupLetter={match.group_letter}
                      kickoffAt={match.kickoff_at}
                      venue={match.venue}
                      status={match.status}
                      home={home}
                      away={away}
                    />
                    <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                      {es.admin.scheduleCurrentKickoff.replace(
                        "{time}",
                        formatMatchTime(match.kickoff_at)
                      )}
                    </p>
                    <AdminMatchScheduleForm
                      match={match}
                      deadlineOffsetMinutes={deadlineOffsetMinutes}
                    />
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
