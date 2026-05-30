"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminOverridePrediction } from "@/app/actions/admin-predictions";
import { FixtureMatchRow } from "@/components/fixture/fixture-match-row";
import { Button } from "@/components/ui/button";
import { es } from "@/lib/i18n/es";
import { matchToFixtureSides } from "@/lib/matches/fixture-sides";
import type { MatchPhase, MatchWithTeams, Prediction } from "@/types/database";

interface AdminPredictionOverrideFormProps {
  userId: string;
  match: MatchWithTeams;
  prediction: Prediction | null;
}

function parseScore(value: string): number | null {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0 || n > 20) return null;
  return n;
}

export function AdminPredictionOverrideForm({
  userId,
  match,
  prediction,
}: AdminPredictionOverrideFormProps) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(
    prediction ? String(prediction.predicted_home) : "0"
  );
  const [awayScore, setAwayScore] = useState(
    prediction ? String(prediction.predicted_away) : "0"
  );
  const [advancesTeamId, setAdvancesTeamId] = useState(
    prediction?.predicted_advances_team_id != null
      ? String(prediction.predicted_advances_team_id)
      : ""
  );
  const [adminNote, setAdminNote] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isKnockout = match.phase !== "group_stage";
  const homeNum = parseScore(homeScore);
  const awayNum = parseScore(awayScore);
  const isDraw = homeNum != null && awayNum != null && homeNum === awayNum;

  const savedHome = prediction?.predicted_home ?? null;
  const savedAway = prediction?.predicted_away ?? null;
  const savedAdvances = prediction?.predicted_advances_team_id ?? null;
  const newAdvances =
    isKnockout && isDraw && advancesTeamId
      ? Number.parseInt(advancesTeamId, 10)
      : null;

  const hasChanges =
    homeNum !== savedHome ||
    awayNum !== savedAway ||
    newAdvances !== savedAdvances;

  const { home, away } = matchToFixtureSides(match);

  async function handleSubmit() {
    if (homeNum == null || awayNum == null) {
      setError(es.admin.invalidScoreError);
      return;
    }
    if (isKnockout && isDraw && !advancesTeamId) {
      setError(es.admin.advancesRequiredError);
      return;
    }
    if (adminNote.trim().length < 10) {
      setError(es.admin.adminNoteRequired);
      return;
    }
    if (!hasChanges) {
      setError(es.admin.noChangesError);
      return;
    }

    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const result = await adminOverridePrediction({
        userId,
        matchId: match.id,
        newHome: homeNum,
        newAway: awayNum,
        newAdvancesTeamId: newAdvances,
        adminNote: adminNote.trim(),
      });
      setMessage(
        result.pointsRecalculated
          ? es.admin.overrideSuccessRecalc
          : es.admin.overrideSuccess
      );
      setAdminNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.admin.errorGeneric);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      {prediction?.admin_overridden && (
        <div className="mb-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {es.admin.overriddenBadge}
        </div>
      )}

      <FixtureMatchRow
        matchNumber={match.fifa_match_number ?? 0}
        phase={match.phase as MatchPhase}
        groupLetter={match.group_letter}
        kickoffAt={match.kickoff_at}
        venue={match.venue}
        status={match.status}
        home={home}
        away={away}
        homeScore={match.home_score}
        awayScore={match.away_score}
        showScore={match.status === "finished" || match.status === "live"}
      />

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[var(--color-border)] pt-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-muted-foreground)]">Local</span>
          <input
            type="number"
            min={0}
            max={20}
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            className="w-16 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-center font-mono"
          />
        </label>
        <span className="pb-2 font-bold text-[var(--color-muted-foreground)]">—</span>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-muted-foreground)]">Visitante</span>
          <input
            type="number"
            min={0}
            max={20}
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            className="w-16 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-center font-mono"
          />
        </label>

        {isKnockout && isDraw && match.home_team && match.away_team && (
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
            <span className="text-[var(--color-muted-foreground)]">
              {es.admin.advancesLabel}
            </span>
            <select
              value={advancesTeamId}
              onChange={(e) => setAdvancesTeamId(e.target.value)}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5"
            >
              <option value="">{es.admin.selectAdvances}</option>
              <option value={match.home_team.id}>{match.home_team.name_es}</option>
              <option value={match.away_team.id}>{match.away_team.name_es}</option>
            </select>
          </label>
        )}
      </div>

      {hasChanges && homeNum != null && awayNum != null && (
        <div className="mt-4 rounded-lg border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-950/60">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            {es.admin.correctionPreview}
          </p>
          <p className="mt-2 font-mono text-sm">
            {savedHome ?? "—"} — {savedAway ?? "—"}
            <span className="mx-2">→</span>
            {homeNum} — {awayNum}
          </p>
          <label className="mt-3 block text-sm">
            <span className="font-medium">{es.admin.adminNoteLabel}</span>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder={es.admin.adminNoteHint}
            />
          </label>
          <Button
            type="button"
            variant="destructive"
            className="mt-3"
            disabled={pending}
            onClick={() => void handleSubmit()}
          >
            {pending ? es.admin.saving : es.admin.confirmOverride}
          </Button>
        </div>
      )}

      {message && (
        <p className="mt-2 text-sm text-green-600" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
