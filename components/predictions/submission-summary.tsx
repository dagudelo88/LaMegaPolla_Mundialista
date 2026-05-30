"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TeamFlag } from "@/components/predictions/team-flag";
import { submitFullTournament } from "@/app/actions/predictions";
import { resolveTournamentPodium } from "@/lib/bracket/knockout-resolver";
import type { GroupMatchResult, KnockoutMatchDef } from "@/lib/bracket/types";
import { buildKnockoutPredictionsMap, computePredictionSummary } from "@/lib/predictions/helpers";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";

interface TeamRow {
  id: number;
  fifa_code: string;
  name_es: string;
  flag_emoji: string | null;
  group_letter: string;
}

interface MatchRow {
  id: string;
  fifa_match_number: number | null;
  phase: string;
}

interface PredictionRow {
  match_id: string;
  predicted_home: number;
  predicted_away: number;
  predicted_advances_team_id: number | null;
}

interface SubmissionSummaryProps {
  groupDone: number;
  groupTotal: number;
  knockoutDone: number;
  knockoutTotal: number;
  thirdDone: number;
  disabled: boolean;
  deadlinePassed: boolean;
  knockoutUnlocked: boolean;
  teams: TeamRow[];
  matches: MatchRow[];
  predictions: PredictionRow[];
  groupResults: GroupMatchResult[];
  advancingThirdGroups: string[];
  knockoutDefs: KnockoutMatchDef[];
}

function PodiumSlot({
  label,
  team,
  highlight,
}: {
  label: string;
  team: TeamRow | null;
  highlight?: "gold" | "silver" | "bronze";
}) {
  const borderClass =
    highlight === "gold"
      ? "border-[var(--color-accent)]"
      : highlight === "silver"
        ? "border-slate-400"
        : highlight === "bronze"
          ? "border-amber-700"
          : "border-[var(--color-border)]";

  return (
    <div
      className={`flex flex-col items-center rounded-lg border-2 ${borderClass} bg-[var(--color-background)] px-4 py-5 text-center`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </p>
      {team ? (
        <>
          <div className="mt-4">
            <TeamFlag fifaCode={team.fifa_code} name={team.name_es} size="lg" />
          </div>
          <p className="mt-3 text-lg font-semibold leading-tight">{team.name_es}</p>
        </>
      ) : (
        <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">—</p>
      )}
    </div>
  );
}

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {detail && (
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{detail}</p>
      )}
    </div>
  );
}

export function SubmissionSummary({
  groupDone,
  groupTotal,
  knockoutDone,
  knockoutTotal,
  thirdDone,
  disabled,
  deadlinePassed,
  knockoutUnlocked,
  teams,
  matches,
  predictions,
  groupResults,
  advancingThirdGroups,
  knockoutDefs,
}: SubmissionSummaryProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const podium = useMemo(() => {
    if (!knockoutUnlocked) return null;

    const knockoutPredictions = buildKnockoutPredictionsMap(matches, predictions);
    const teamRefs = teams.map((t) => ({
      id: t.id,
      fifaCode: t.fifa_code,
      groupLetter: t.group_letter,
    }));

    return resolveTournamentPodium(
      knockoutDefs,
      teamRefs,
      groupResults,
      advancingThirdGroups,
      knockoutPredictions
    );
  }, [
    knockoutUnlocked,
    matches,
    predictions,
    teams,
    groupResults,
    advancingThirdGroups,
    knockoutDefs,
  ]);

  const stats = useMemo(
    () => computePredictionSummary(matches, predictions),
    [matches, predictions]
  );

  const complete =
    groupDone >= groupTotal &&
    knockoutDone >= knockoutTotal &&
    thirdDone >= 8;

  const handleSubmit = () => {
    if (!confirm(es.pronosticos.submitConfirm)) return;
    startTransition(async () => {
      try {
        await submitFullTournament();
        setSuccess(true);
        setError(null);
        router.refresh();
      } catch (e) {
        setSuccess(false);
        setError(e instanceof Error ? e.message : es.pronosticos.saveError);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <h3 className="text-lg font-semibold">{es.pronosticos.summaryPodiumTitle}</h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {es.pronosticos.summaryPodiumHint}
        </p>

        {!knockoutUnlocked ? (
          <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
            {es.pronosticos.summaryPodiumPending}
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <PodiumSlot
              label={es.pronosticos.summaryChampion}
              team={podium?.championId ? teamMap.get(podium.championId) ?? null : null}
              highlight="gold"
            />
            <PodiumSlot
              label={es.pronosticos.summaryRunnerUp}
              team={podium?.runnerUpId ? teamMap.get(podium.runnerUpId) ?? null : null}
              highlight="silver"
            />
            <PodiumSlot
              label={es.pronosticos.summaryThirdPlace}
              team={podium?.thirdPlaceId ? teamMap.get(podium.thirdPlaceId) ?? null : null}
              highlight="bronze"
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <h3 className="text-lg font-semibold">{es.pronosticos.summaryStatsTitle}</h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {es.pronosticos.summaryStatsHint}
        </p>

        {stats.matchesPredicted === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
            {es.pronosticos.summaryStatsEmpty}
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile label={es.pronosticos.summaryTotalGoals} value={String(stats.totalGoals)} />
            <StatTile
              label={es.pronosticos.summaryAvgGoals}
              value={stats.avgGoalsPerMatch.toFixed(1)}
            />
            <StatTile
              label={es.pronosticos.summaryDraws}
              value={String(stats.draws)}
              detail={`${es.pronosticos.groupProgress}: ${stats.groupDraws} · ${es.pronosticos.knockoutProgress}: ${stats.knockoutDraws}`}
            />
            <StatTile label={es.pronosticos.summaryHomeWins} value={String(stats.homeWins)} />
            <StatTile label={es.pronosticos.summaryAwayWins} value={String(stats.awayWins)} />
            <StatTile
              label={es.pronosticos.summaryGroupGoals}
              value={String(stats.groupGoals)}
              detail={`${es.pronosticos.summaryKnockoutGoals}: ${stats.knockoutGoals}`}
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center">
        <h3 className="text-lg font-semibold">{es.pronosticos.submitTitle}</h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{es.pronosticos.submitHint}</p>

        <ul className="mt-4 space-y-2 text-sm">
          <li>
            {es.pronosticos.groupProgress}: {groupDone}/{groupTotal}
          </li>
          <li>
            {es.pronosticos.thirdProgress}: {thirdDone}/8
          </li>
          <li>
            {es.pronosticos.knockoutProgress}: {knockoutDone}/{knockoutTotal}
          </li>
        </ul>

        {deadlinePassed && (
          <p className="mt-4 text-sm text-red-500">{es.pronosticos.deadlinePassed}</p>
        )}

        {!disabled && !deadlinePassed && (
          <Button
            type="button"
            className="mt-6"
            disabled={pending || !complete || success}
            onClick={handleSubmit}
          >
            {es.pronosticos.submitButton}
          </Button>
        )}

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        {success && (
          <p className="mt-2 text-sm text-green-600">{es.pronosticos.submitted}</p>
        )}
      </div>
    </div>
  );
}
