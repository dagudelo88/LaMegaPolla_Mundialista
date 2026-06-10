"use client";

import { useMemo, useState } from "react";
import { AdminPredictionOverrideForm } from "@/components/admin/admin-prediction-override-form";
import { resolveAllKnockoutMatches } from "@/lib/bracket/knockout-resolver";
import type { GroupMatchResult, KnockoutMatchDef, TeamRef } from "@/lib/bracket/types";
import { es } from "@/lib/i18n/es";
import {
  formatAppDateTime,
  formatMatchDateHeader,
  formatMatchDateSortKey,
} from "@/lib/matches/format-datetime";
import type { MatchWithTeams, Prediction, PredictionAdminOverride, Team } from "@/types/database";
import type { UserSubmissionReadiness } from "@/lib/predictions/submission-readiness";
import {
  AdminPlayerSubmissionCard,
  type SubmissionProgress,
} from "@/components/admin/admin-submit-predictions-actions";

type Tab = "groups" | "knockout";

interface AdminUserPredictionsPanelProps {
  userId: string;
  username: string;
  matches: MatchWithTeams[];
  predictions: Prediction[];
  teams: Team[];
  groupResults: GroupMatchResult[];
  advancingThirdGroups: string[];
  knockoutDefs: KnockoutMatchDef[];
  overrideHistory: PredictionAdminOverride[];
  submissionReadiness: UserSubmissionReadiness;
  submissionProgress: SubmissionProgress;
  submittedAt: string | null;
}

export function AdminUserPredictionsPanel({
  userId,
  username,
  matches,
  predictions,
  teams,
  groupResults,
  advancingThirdGroups,
  knockoutDefs,
  overrideHistory,
  submissionReadiness,
  submissionProgress,
  submittedAt,
}: AdminUserPredictionsPanelProps) {
  const [tab, setTab] = useState<Tab>("groups");
  const predMap = useMemo(
    () => new Map(predictions.map((p) => [p.match_id, p])),
    [predictions]
  );

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const knockoutPredictions = useMemo(() => {
    const map = new Map<
      number,
      { predictedHome: number; predictedAway: number; predictedAdvancesTeamId?: number | null }
    >();
    for (const m of matches) {
      if (m.phase === "group_stage" || !m.fifa_match_number) continue;
      const pred = predMap.get(m.id);
      if (pred) {
        map.set(m.fifa_match_number, {
          predictedHome: pred.predicted_home,
          predictedAway: pred.predicted_away,
          predictedAdvancesTeamId: pred.predicted_advances_team_id,
        });
      }
    }
    return map;
  }, [matches, predMap]);

  const teamRefs: TeamRef[] = useMemo(
    () =>
      teams.map((t) => ({
        id: t.id,
        fifaCode: t.fifa_code,
        groupLetter: t.group_letter,
        fifaRanking: t.fifa_ranking ?? null,
        teamConductScore: t.team_conduct_score ?? 0,
        manualTieBreakRank: t.manual_tie_break_rank ?? null,
      })),
    [teams]
  );

  const resolvedKnockout = useMemo(
    () =>
      resolveAllKnockoutMatches(
        knockoutDefs,
        teamRefs,
        groupResults,
        advancingThirdGroups,
        knockoutPredictions
      ),
    [knockoutDefs, teamRefs, groupResults, advancingThirdGroups, knockoutPredictions]
  );

  const filtered = useMemo(() => {
    const list =
      tab === "groups"
        ? matches.filter((m) => m.phase === "group_stage")
        : matches.filter((m) => m.phase !== "group_stage");
    return [...list].sort(
      (a, b) => (a.fifa_match_number ?? 0) - (b.fifa_match_number ?? 0)
    );
  }, [matches, tab]);

  const byDate = useMemo(() => {
    const map = new Map<string, MatchWithTeams[]>();
    for (const match of filtered) {
      const key = formatMatchDateSortKey(match.kickoff_at);
      const list = map.get(key) ?? [];
      list.push(match);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  function enrichKnockoutMatch(match: MatchWithTeams): MatchWithTeams {
    if (match.phase === "group_stage" || !match.fifa_match_number) return match;
    const resolved = resolvedKnockout.get(match.fifa_match_number);
    if (!resolved) return match;
    return {
      ...match,
      home_team: resolved.homeTeamId
        ? (teamMap.get(resolved.homeTeamId) ?? match.home_team ?? null)
        : match.home_team,
      away_team: resolved.awayTeamId
        ? (teamMap.get(resolved.awayTeamId) ?? match.away_team ?? null)
        : match.away_team,
    };
  }

  return (
    <div className="space-y-6">
      <AdminPlayerSubmissionCard
        userId={userId}
        username={username}
        submissionReadiness={submissionReadiness}
        submittedAt={submittedAt}
        progress={submissionProgress}
      />

      <p className="text-sm text-[var(--color-muted-foreground)]">
        Editando pronósticos de <strong>@{username}</strong>
      </p>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "groups" as const, label: "Fase de grupos" },
            { key: "knockout" as const, label: "Eliminatorias" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === t.key
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {byDate.map(([dateKey, dayMatches]) => (
        <section key={dateKey} className="space-y-3">
          <h2 className="text-lg font-semibold">
            {formatMatchDateHeader(dayMatches[0]!.kickoff_at)}
          </h2>
          {dayMatches.map((match) => (
            <AdminPredictionOverrideForm
              key={match.id}
              userId={userId}
              match={tab === "knockout" ? enrichKnockoutMatch(match) : match}
              prediction={predMap.get(match.id) ?? null}
            />
          ))}
        </section>
      ))}

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="text-lg font-semibold">{es.admin.overrideHistory}</h2>
        {!overrideHistory.length ? (
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            {es.admin.noOverrideHistory}
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {overrideHistory.map((row) => (
              <li
                key={row.id}
                className="border-b border-[var(--color-border)] pb-2 last:border-0"
              >
                <span className="text-[var(--color-muted-foreground)]">
                  {formatAppDateTime(row.created_at)}
                </span>
                {" · "}
                {row.old_home ?? "—"}-{row.old_away ?? "—"} → {row.new_home}-{row.new_away}
                <p className="mt-1 text-[var(--color-muted-foreground)]">{row.admin_note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
