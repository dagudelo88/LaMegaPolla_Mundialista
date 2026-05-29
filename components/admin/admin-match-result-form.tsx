"use client";

import { useState } from "react";
import { setMatchLive, setMatchResult } from "@/app/actions/admin";
import {
  FixtureMatchRow,
} from "@/components/fixture/fixture-match-row";
import { matchToFixtureSides } from "@/lib/matches/fixture-sides";
import { Button } from "@/components/ui/button";
import { es } from "@/lib/i18n/es";
import type { MatchPhase, MatchWithTeams } from "@/types/database";

interface AdminMatchResultFormProps {
  match: MatchWithTeams;
}

export function AdminMatchResultForm({ match }: AdminMatchResultFormProps) {
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
  const homeNum = Number.parseInt(homeScore, 10);
  const awayNum = Number.parseInt(awayScore, 10);
  const isDraw =
    Number.isFinite(homeNum) &&
    Number.isFinite(awayNum) &&
    homeNum === awayNum;

  const { home, away } = matchToFixtureSides(match);

  async function handleSave() {
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const { usersScored } = await setMatchResult(
        match.id,
        homeNum,
        awayNum,
        isKnockout && isDraw && advancesTeamId
          ? Number.parseInt(advancesTeamId, 10)
          : undefined
      );
      setMessage(es.admin.saved.replace("{count}", String(usersScored)));
    } catch (e) {
      setError(e instanceof Error ? e.message : es.admin.errorGeneric);
    } finally {
      setPending(false);
    }
  }

  async function handleMarkLive() {
    setLivePending(true);
    setError(null);
    try {
      await setMatchLive(match.id);
      setMessage("Partido marcado como en vivo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : es.admin.errorGeneric);
    } finally {
      setLivePending(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
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
        <span className="pb-2 text-lg font-bold text-[var(--color-muted-foreground)]">—</span>
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
          <Button type="button" disabled={pending || livePending} onClick={handleSave}>
            {pending ? es.admin.saving : es.admin.saveResult}
          </Button>
        </div>
      </div>

      <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{es.admin.scoreHint}</p>

      {message && (
        <p className="mt-2 text-sm text-green-600" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
