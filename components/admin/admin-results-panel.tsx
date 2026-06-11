"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  resolveOfficialKnockoutBracket,
  updateTeamTieBreakMetadata,
  validateOfficialQualifiers,
} from "@/app/actions/admin";
import { AdminMatchResultForm } from "@/components/admin/admin-match-result-form";
import { Button } from "@/components/ui/button";
import {
  formatFifaScheduleDateHeader,
  getFifaScheduleDateKey,
} from "@/lib/matches/format-datetime";
import { es } from "@/lib/i18n/es";
import { TeamFlag } from "@/components/predictions/team-flag";
import type { MatchWithTeams } from "@/types/database";

type StatusFilter = "pending" | "live" | "finished" | "all";

interface OfficialQualifiedTeam {
  code: string;
  qualification: string;
  fifaCode: string;
  name: string;
  played: number;
  pts: number;
  gd: number;
  gf: number;
}

interface OfficialThirdPlaceTeam {
  code: string;
  rankAmongThirds: number;
  advances: boolean;
  teamId: number;
  fifaCode: string;
  name: string;
  pts: number;
  gd: number;
  gf: number;
  manual_tie_break_rank?: number | null;
  manualTieBreakRank?: number | null;
}

interface AdminResultsPanelProps {
  matches: MatchWithTeams[];
  officialQualifiedTeams: OfficialQualifiedTeam[];
  officialThirdPlaceTeams: OfficialThirdPlaceTeam[];
  groupStageComplete: boolean;
}

function countByFilter(matches: MatchWithTeams[], filter: StatusFilter): number {
  if (filter === "all") return matches.length;
  if (filter === "pending") {
    return matches.filter((m) => m.status !== "finished").length;
  }
  if (filter === "live") {
    return matches.filter((m) => m.status === "live").length;
  }
  return matches.filter((m) => m.status === "finished").length;
}

function emptyIfNull(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function ThirdPlaceOrderForm({
  third,
  onSaved,
}: {
  third: OfficialThirdPlaceTeam;
  onSaved: () => void;
}) {
  const [manual, setManual] = useState(
    emptyIfNull(third.manualTieBreakRank ?? third.manual_tie_break_rank)
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      await updateTeamTieBreakMetadata(third.teamId, {
        manualTieBreakRank: numberOrNull(manual),
      });
      setMessage(es.admin.thirdOrderSaved);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.admin.errorGeneric);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-3 border-b border-[var(--color-border)]/60 py-2 text-sm sm:grid-cols-[auto_1fr_auto_auto_auto_auto] sm:items-center">
      <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--color-muted-foreground)]">
        #{third.rankAmongThirds}
      </span>
      <span className="inline-flex items-center gap-1.5 font-medium">
        <TeamFlag fifaCode={third.fifaCode} name={third.name} />
        {third.code} · {third.name}
      </span>
      <span className={third.advances ? "text-emerald-600" : "text-[var(--color-muted-foreground)]"}>
        {third.advances ? es.pronosticos.thirdPlaceAdvances : es.pronosticos.thirdPlaceEliminated}
      </span>
      <span className="tabular-nums">Pts {third.pts}</span>
      <span className="tabular-nums">DG {third.gd}</span>
      <label className="flex items-center gap-2 text-xs">
        <span className="text-[var(--color-muted-foreground)]">Orden manual</span>
        <input
          type="number"
          min={1}
          max={12}
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          className="w-16 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1"
        />
      </label>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-3"
        disabled={pending}
        onClick={handleSave}
      >
        {pending ? es.admin.saving : es.admin.thirdOrderSave}
      </Button>
      {message && <p className="mt-2 text-xs text-green-600">{message}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function AdminResultsPanel({
  matches,
  officialQualifiedTeams,
  officialThirdPlaceTeams,
  groupStageComplete,
}: AdminResultsPanelProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [bracketPending, setBracketPending] = useState(false);
  const [bracketMessage, setBracketMessage] = useState<string | null>(null);
  const [bracketError, setBracketError] = useState<string | null>(null);
  const [qualifiersPending, setQualifiersPending] = useState(false);
  const [qualifiersMessage, setQualifiersMessage] = useState<string | null>(null);
  const [qualifiersError, setQualifiersError] = useState<string | null>(null);

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: "pending", label: es.admin.filterPending },
    { key: "live", label: es.admin.filterLive },
    { key: "finished", label: es.admin.filterFinished },
    { key: "all", label: es.admin.filterAll },
  ];

  const filtered = useMemo(() => {
    let list = matches;
    if (filter === "pending") {
      list = matches.filter((m) => m.status !== "finished");
    } else if (filter === "live") {
      list = matches.filter((m) => m.status === "live");
    } else if (filter === "finished") {
      list = matches.filter((m) => m.status === "finished");
    }
    return [...list].sort(
      (a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
    );
  }, [matches, filter]);

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

  async function handleResolveBracket() {
    setBracketPending(true);
    setBracketMessage(null);
    setBracketError(null);
    try {
      const result = await resolveOfficialKnockoutBracket();
      setBracketMessage(
        es.admin.resolveSuccess
          .replace("{updated}", String(result.updatedMatches))
          .replace("{unresolved}", String(result.unresolvedMatches))
      );
    } catch (e) {
      setBracketError(e instanceof Error ? e.message : es.admin.errorGeneric);
    } finally {
      setBracketPending(false);
    }
  }

  async function handleValidateQualifiers() {
    setQualifiersPending(true);
    setQualifiersMessage(null);
    setQualifiersError(null);
    try {
      const result = await validateOfficialQualifiers();
      setQualifiersMessage(
        es.admin.validateQualifiersSuccess.replace(
          "{date}",
          new Date(result.validatedAt).toLocaleString("es-CO")
        )
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : es.admin.errorGeneric;
      setQualifiersError(
        message === "group_stage_not_complete"
          ? es.admin.validateQualifiersIncomplete
          : message
      );
    } finally {
      setQualifiersPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="text-lg font-semibold">{es.admin.resolveBracket}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {es.admin.resolveBracketHint}
        </p>
        <Button
          type="button"
          className="mt-3"
          variant="outline"
          disabled={bracketPending}
          onClick={handleResolveBracket}
        >
          {bracketPending ? es.admin.saving : es.admin.resolveBracket}
        </Button>
        {bracketMessage && (
          <p className="mt-2 text-sm text-green-600" role="status">
            {bracketMessage}
          </p>
        )}
        {bracketError && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {bracketError}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="text-lg font-semibold">{es.admin.validateQualifiers}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {es.admin.validateQualifiersHint}
        </p>

        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{es.admin.validateQualifiersReviewTitle}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                groupStageComplete
                  ? "bg-emerald-500/15 text-emerald-700"
                  : "bg-amber-500/15 text-amber-700"
              }`}
            >
              {groupStageComplete
                ? es.admin.validateQualifiersReady
                : es.admin.validateQualifiersPending}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {es.admin.validateQualifiersReviewHint}
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-muted-foreground)]">
                  <th className="pb-2 pr-3">Código</th>
                  <th className="pb-2 pr-3">{es.pronosticos.team}</th>
                  <th className="pb-2 pr-3">Vía</th>
                  <th className="pb-2 pr-3">{es.pronosticos.pg}</th>
                  <th className="pb-2 pr-3">{es.pronosticos.pts}</th>
                  <th className="pb-2 pr-3">{es.pronosticos.dg}</th>
                  <th className="pb-2">GF</th>
                </tr>
              </thead>
              <tbody>
                {officialQualifiedTeams.map((team) => (
                  <tr
                    key={team.code}
                    className="border-b border-[var(--color-border)]/60"
                  >
                    <td className="py-2 pr-3">
                      <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                        {team.code}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <TeamFlag fifaCode={team.fifaCode} name={team.name} />
                        {team.name}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-[var(--color-muted-foreground)]">
                      {team.qualification}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{team.played}</td>
                    <td className="py-2 pr-3 tabular-nums">{team.pts}</td>
                    <td className="py-2 pr-3 tabular-nums">{team.gd}</td>
                    <td className="py-2 tabular-nums">{team.gf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
          <h3 className="font-semibold">{es.admin.tieBreakCorrectionsTitle}</h3>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {es.admin.tieBreakCorrectionsHint}
          </p>
          <div className="mt-3">
            {officialThirdPlaceTeams.map((third) => (
              <ThirdPlaceOrderForm
                key={third.code}
                third={third}
                onSaved={() => router.refresh()}
              />
            ))}
          </div>
        </div>

        <Button
          type="button"
          className="mt-3"
          variant="outline"
          disabled={qualifiersPending || !groupStageComplete}
          onClick={handleValidateQualifiers}
        >
          {qualifiersPending ? es.admin.saving : es.admin.validateQualifiers}
        </Button>
        {qualifiersMessage && (
          <p className="mt-2 text-sm text-green-600" role="status">
            {qualifiersMessage}
          </p>
        )}
        {qualifiersError && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {qualifiersError}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-border)]"
            }`}
          >
            {tab.label} ({countByFilter(matches, tab.key)})
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {es.admin.noMatchesFilter}
        </p>
      ) : (
        byDate.map(([dateKey, dayMatches]) => (
          <section key={dateKey} className="space-y-3">
            <h2 className="text-lg font-semibold">
              {formatFifaScheduleDateHeader(dateKey)}
            </h2>
            {dayMatches.map((match) => (
              <AdminMatchResultForm key={match.id} match={match} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}
