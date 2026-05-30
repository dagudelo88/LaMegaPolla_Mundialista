"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { setMatchLive, setMatchResult } from "@/app/actions/admin";
import { FixtureMatchRow } from "@/components/fixture/fixture-match-row";
import { Button } from "@/components/ui/button";
import { es } from "@/lib/i18n/es";
import { matchToFixtureSides } from "@/lib/matches/fixture-sides";
import type { MatchPhase, MatchWithTeams } from "@/types/database";

interface AdminMatchResultFormProps {
  match: MatchWithTeams;
}

function parseScore(value: string): number | null {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0 || n > 20) return null;
  return n;
}

function teamName(match: MatchWithTeams, teamId: number | null): string {
  if (teamId == null) return "—";
  if (match.home_team?.id === teamId) return match.home_team.name_es;
  if (match.away_team?.id === teamId) return match.away_team.name_es;
  return "—";
}

export function AdminMatchResultForm({ match }: AdminMatchResultFormProps) {
  const router = useRouter();
  const confirmRef = useRef<HTMLDivElement>(null);
  const isFinished = match.status === "finished";
  const [homeScore, setHomeScore] = useState(
    match.home_score != null ? String(match.home_score) : "0"
  );
  const [awayScore, setAwayScore] = useState(
    match.away_score != null ? String(match.away_score) : "0"
  );
  const [advancesTeamId, setAdvancesTeamId] = useState<string>(
    match.result_advances_team_id != null
      ? String(match.result_advances_team_id)
      : ""
  );
  const [pending, setPending] = useState(false);
  const [livePending, setLivePending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isKnockout = match.phase !== "group_stage";
  const homeNum = parseScore(homeScore);
  const awayNum = parseScore(awayScore);
  const isDraw =
    homeNum != null && awayNum != null && homeNum === awayNum;

  const savedHome = match.home_score ?? 0;
  const savedAway = match.away_score ?? 0;
  const savedAdvances = match.result_advances_team_id ?? null;
  const newAdvances =
    isKnockout && isDraw && advancesTeamId
      ? Number.parseInt(advancesTeamId, 10)
      : null;

  const hasChanges =
    homeNum !== savedHome ||
    awayNum !== savedAway ||
    newAdvances !== savedAdvances;

  const scoresValid = homeNum != null && awayNum != null;
  const advancesValid = !isKnockout || !isDraw || advancesTeamId !== "";
  const isCorrection = isFinished && hasChanges;

  function validateClient(): string | null {
    if (!scoresValid) return es.admin.invalidScoreError;
    if (!advancesValid) return es.admin.advancesRequiredError;
    if (isFinished && !hasChanges) return es.admin.noChangesError;
    return null;
  }

  const { home, away } = matchToFixtureSides(match);

  useEffect(() => {
    if (isCorrection && confirmRef.current) {
      confirmRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isCorrection, homeScore, awayScore, advancesTeamId]);

  function formatSuccessMessage(
    usersScored: number,
    bracket: { updatedMatches: number; unresolvedMatches: number }
  ) {
    return es.admin.savedWithBracket
      .replace("{count}", String(usersScored))
      .replace("{updated}", String(bracket.updatedMatches))
      .replace("{unresolved}", String(bracket.unresolvedMatches));
  }

  async function submitResult() {
    const validationError = validateClient();
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const result = await setMatchResult(
        match.id,
        homeNum!,
        awayNum!,
        isKnockout && isDraw && advancesTeamId
          ? Number.parseInt(advancesTeamId, 10)
          : undefined
      );
      setMessage(formatSuccessMessage(result.usersScored, result.bracket));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.admin.errorGeneric);
    } finally {
      setPending(false);
    }
  }

  function handleReset() {
    setHomeScore(match.home_score != null ? String(match.home_score) : "0");
    setAwayScore(match.away_score != null ? String(match.away_score) : "0");
    setAdvancesTeamId(
      match.result_advances_team_id != null
        ? String(match.result_advances_team_id)
        : ""
    );
    setError(null);
  }

  async function handleMarkLive() {
    setLivePending(true);
    setError(null);
    try {
      await setMatchLive(match.id);
      setMessage("Partido marcado como en vivo.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.admin.errorGeneric);
    } finally {
      setLivePending(false);
    }
  }

  const canSubmit =
    scoresValid &&
    advancesValid &&
    (!isFinished || hasChanges) &&
    !pending &&
    !livePending;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      {isFinished && (
        <div className="mb-3 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-300">
          {es.admin.validatedBadge}: {savedHome} — {savedAway}
          {savedAdvances != null && (
            <span className="ml-2 text-green-700 dark:text-green-400">
              ({teamName(match, savedAdvances)} avanza)
            </span>
          )}
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
            onChange={(e) => {
              setHomeScore(e.target.value);
              setError(null);
            }}
            className="w-16 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-center font-mono"
          />
        </label>
        <span className="pb-2 text-lg font-bold text-[var(--color-muted-foreground)]">
          —
        </span>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-muted-foreground)]">Visitante</span>
          <input
            type="number"
            min={0}
            max={20}
            value={awayScore}
            onChange={(e) => {
              setAwayScore(e.target.value);
              setError(null);
            }}
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
              onChange={(e) => {
                setAdvancesTeamId(e.target.value);
                setError(null);
              }}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5"
            >
              <option value="">{es.admin.selectAdvances}</option>
              <option value={match.home_team.id}>{match.home_team.name_es}</option>
              <option value={match.away_team.id}>{match.away_team.name_es}</option>
            </select>
          </label>
        )}

        <div className="flex flex-wrap gap-2">
          {match.status === "scheduled" && (
            <Button
              type="button"
              variant="outline"
              disabled={livePending || pending}
              onClick={handleMarkLive}
            >
              {es.admin.markLive}
            </Button>
          )}

          {!isFinished && (
            <Button
              type="button"
              disabled={!canSubmit}
              onClick={() => void submitResult()}
            >
              {pending ? es.admin.saving : es.admin.saveResult}
            </Button>
          )}

          {isCorrection && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending || livePending}
              onClick={handleReset}
            >
              {es.admin.cancelCorrection}
            </Button>
          )}
        </div>
      </div>

      {isCorrection && scoresValid && advancesValid && (
        <div
          ref={confirmRef}
          className="mt-4 rounded-lg border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-950/60"
        >
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            {es.admin.correctionPreview}
          </p>
          <p className="mt-2 font-mono text-base text-amber-950 dark:text-amber-50">
            {savedHome} — {savedAway}
            <span className="mx-2 text-[var(--color-muted-foreground)]">→</span>
            {homeNum} — {awayNum}
          </p>
          {isKnockout && isDraw && (
            <p className="mt-2 text-sm text-amber-900 dark:text-amber-200">
              {es.admin.correctionPreviewAdvances}:{" "}
              {teamName(match, savedAdvances)} → {teamName(match, newAdvances)}
            </p>
          )}
          <div className="mt-3">
            <Button
              type="button"
              variant="destructive"
              disabled={!canSubmit}
              onClick={() => void submitResult()}
            >
              {pending ? es.admin.saving : es.admin.confirmCorrection}
            </Button>
          </div>
        </div>
      )}

      <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
        {es.admin.scoreHint}
      </p>

      {message && (
        <p className="mt-2 text-sm text-green-600" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm font-medium text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
