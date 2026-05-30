"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { savePredictionDraft, applyPaidPredictionChange } from "@/app/actions/predictions";
import { TeamWithFlag } from "@/components/predictions/team-flag";
import { es } from "@/lib/i18n/es";
import { formatMatchTime } from "@/lib/matches/format-datetime";
import type { PaidChangeBlockReason } from "@/lib/predictions/paid-change-eligibility";
import type { MatchPhase } from "@/types/database";
import { PHASE_LABELS } from "@/types/database";
import { Button } from "@/components/ui/button";

export interface MatchCardTeam {
  id: number;
  fifa_code: string;
  name_es: string;
  flag_emoji: string | null;
}

export interface MatchCardProps {
  matchId: string;
  matchNumber: number;
  phase: MatchPhase;
  groupLetter?: string | null;
  kickoffAt: string;
  venue: string | null;
  home: MatchCardTeam | null;
  away: MatchCardTeam | null;
  homeLabel?: string;
  awayLabel?: string;
  initialHome: number | "";
  initialAway: number | "";
  initialAdvancesTeamId: number | null;
  predictionId?: string;
  disabled: boolean;
  paidChangeMode?: boolean;
  paidChangeEligible?: boolean;
  paidChangeBlockReason?: PaidChangeBlockReason;
  changesExhausted?: boolean;
  changeCost?: number;
  adminOverridden?: boolean;
  /** Highlight as jornada's predicted top-scorer (schedule tab) */
  jornadaTopScorerGoals?: number | null;
  onSaved?: () => void;
}

function paidChangeBlockMessage(reason: PaidChangeBlockReason): string {
  if (reason === "match_same_day") return es.pronosticos.paidChangeSameDayBlocked;
  if (reason === "match_locked") return es.pronosticos.paidChangeLocked;
  return es.pronosticos.paidChangeNotScheduled;
}

function PredictionTeamSide({
  team,
  label,
}: {
  team: MatchCardTeam | null;
  label: string;
}) {
  if (team?.fifa_code) {
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
        {label}
      </p>
    </div>
  );
}

const SCORE_MIN = 0;
const SCORE_MAX = 20;

const scoreInputClass =
  "min-w-[2.25rem] w-9 border-0 bg-transparent p-0 text-center text-2xl font-bold tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none sm:min-w-[2.5rem] sm:w-10 sm:text-3xl";

const scoreStepperButtonClass =
  "flex h-8 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-background)] text-lg font-bold leading-none text-[var(--color-muted-foreground)] transition-colors hover:border-emerald-500/40 hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-8";

function parseScoreValue(value: string): number {
  if (value === "") return SCORE_MIN;
  const n = Number(value);
  if (!Number.isInteger(n)) return SCORE_MIN;
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, n));
}

function ScoreStepper({
  value,
  onChange,
  label,
  editable,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  editable: boolean;
}) {
  const numeric = parseScoreValue(value);

  if (!editable) {
    return (
      <span className="min-w-[2.25rem] text-center text-2xl font-bold tabular-nums sm:min-w-[2.5rem] sm:text-3xl">
        {value !== "" ? value : "—"}
      </span>
    );
  }

  const step = (delta: number) => {
    onChange(String(Math.min(SCORE_MAX, Math.max(SCORE_MIN, numeric + delta))));
  };

  const onInputChange = (raw: string) => {
    if (raw === "") {
      onChange("");
      return;
    }
    const n = Number(raw);
    if (!Number.isInteger(n)) return;
    onChange(String(Math.min(SCORE_MAX, Math.max(SCORE_MIN, n))));
  };

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label={`${label} −`}
        disabled={numeric <= SCORE_MIN}
        onClick={() => step(-1)}
        className={scoreStepperButtonClass}
      >
        −
      </button>
      <input
        type="number"
        min={SCORE_MIN}
        max={SCORE_MAX}
        value={value}
        aria-label={label}
        onChange={(e) => onInputChange(e.target.value)}
        className={`${scoreInputClass} rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-1`}
      />
      <button
        type="button"
        aria-label={`${label} +`}
        disabled={numeric >= SCORE_MAX}
        onClick={() => step(1)}
        className={scoreStepperButtonClass}
      >
        +
      </button>
    </div>
  );
}

function scoresMatchInitial(
  h: string,
  a: string,
  adv: number | null,
  initialHome: number | "",
  initialAway: number | "",
  initialAdvancesTeamId: number | null
): boolean {
  if (h === "" || a === "") return true;
  const homeSame = initialHome !== "" && Number(h) === initialHome;
  const awaySame = initialAway !== "" && Number(a) === initialAway;
  const advSame = adv === initialAdvancesTeamId;
  return homeSame && awaySame && advSame;
}

export function MatchPredictionCard({
  matchId,
  matchNumber,
  phase,
  groupLetter,
  kickoffAt,
  venue,
  home,
  away,
  homeLabel,
  awayLabel,
  initialHome,
  initialAway,
  initialAdvancesTeamId,
  predictionId,
  disabled,
  paidChangeMode,
  paidChangeEligible = true,
  paidChangeBlockReason,
  changesExhausted,
  changeCost,
  adminOverridden,
  jornadaTopScorerGoals,
  onSaved,
}: MatchCardProps) {
  const [homeScore, setHomeScore] = useState<string>(
    initialHome === "" ? "" : String(initialHome)
  );
  const [awayScore, setAwayScore] = useState<string>(
    initialAway === "" ? "" : String(initialAway)
  );
  const [advancesId, setAdvancesId] = useState<number | null>(initialAdvancesTeamId);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [editingPaidChange, setEditingPaidChange] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isKnockout = phase !== "group_stage";
  const isDraw =
    homeScore !== "" && awayScore !== "" && Number(homeScore) === Number(awayScore);
  const canEditPaidChange = paidChangeMode && editingPaidChange && !changesExhausted;
  const inputsDisabled =
    paidChangeMode ? !canEditPaidChange : disabled;

  useEffect(() => {
    if (editingPaidChange) return;
    setHomeScore(initialHome === "" ? "" : String(initialHome));
    setAwayScore(initialAway === "" ? "" : String(initialAway));
    setAdvancesId(initialAdvancesTeamId);
    setEditingPaidChange(false);
  }, [initialHome, initialAway, initialAdvancesTeamId, editingPaidChange]);

  const resetPaidChangeDraft = useCallback(() => {
    setHomeScore(initialHome === "" ? "" : String(initialHome));
    setAwayScore(initialAway === "" ? "" : String(initialAway));
    setAdvancesId(initialAdvancesTeamId);
    setEditingPaidChange(false);
    setStatus("idle");
  }, [initialHome, initialAway, initialAdvancesTeamId]);

  const applyPaidChange = useCallback(async () => {
    if (!paidChangeMode || changesExhausted || !predictionId) return;
    if (homeScore === "" || awayScore === "") return;

    const hn = Number(homeScore);
    const an = Number(awayScore);
    if (!Number.isInteger(hn) || !Number.isInteger(an) || hn < 0 || hn > 20 || an < 0 || an > 20) {
      setStatus("error");
      return;
    }
    if (isKnockout && hn === an && advancesId == null) return;

    if (
      scoresMatchInitial(
        homeScore,
        awayScore,
        advancesId,
        initialHome,
        initialAway,
        initialAdvancesTeamId
      )
    ) {
      setStatus("error");
      return;
    }

    const before = `${initialHome}-${initialAway}`;
    const after = `${hn}-${an}`;
    const cost = changeCost ?? 0;
    const confirmed = window.confirm(
      es.pronosticos.paidChangeConfirm
        .replace("{cost}", String(cost))
        .replace("{before}", before)
        .replace("{after}", after)
    );
    if (!confirmed) return;

    setStatus("saving");
    try {
      await applyPaidPredictionChange(predictionId, hn, an, phase, {
        predictedAdvancesTeamId: hn === an ? advancesId : null,
      });
      setEditingPaidChange(false);
      setStatus("saved");
      onSaved?.();
    } catch {
      setStatus("error");
    }
  }, [
    paidChangeMode,
    changesExhausted,
    predictionId,
    homeScore,
    awayScore,
    advancesId,
    isKnockout,
    initialHome,
    initialAway,
    initialAdvancesTeamId,
    changeCost,
    phase,
    onSaved,
  ]);

  const persistDraft = useCallback(
    async (h: string, a: string, adv: number | null) => {
      if (disabled || paidChangeMode) return;
      if (h === "" || a === "") return;
      const hn = Number(h);
      const an = Number(a);
      if (!Number.isInteger(hn) || !Number.isInteger(an) || hn < 0 || hn > 20 || an < 0 || an > 20) {
        setStatus("error");
        return;
      }
      if (isKnockout && hn === an && adv == null) return;

      setStatus("saving");
      try {
        await savePredictionDraft(matchId, hn, an, {
          predictedAdvancesTeamId: hn === an ? adv : null,
        });
        setStatus("saved");
        onSaved?.();
      } catch {
        setStatus("error");
      }
    },
    [disabled, paidChangeMode, matchId, phase, isKnockout, onSaved]
  );

  const scheduleSave = useCallback(
    (h: string, a: string, adv: number | null) => {
      if (paidChangeMode) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => persistDraft(h, a, adv), 500);
    },
    [persistDraft, paidChangeMode]
  );

  const onHomeChange = (v: string) => {
    setHomeScore(v);
    setStatus("idle");
    scheduleSave(v, awayScore, advancesId);
  };

  const onAwayChange = (v: string) => {
    setAwayScore(v);
    setStatus("idle");
    scheduleSave(homeScore, v, advancesId);
  };

  const onAdvanceChange = (id: number | null) => {
    setAdvancesId(id);
    setStatus("idle");
    scheduleSave(homeScore, awayScore, id);
  };

  const homeName = home?.name_es ?? homeLabel ?? "—";
  const awayName = away?.name_es ?? awayLabel ?? "—";

  const unchangedPaidChange =
    paidChangeMode &&
    editingPaidChange &&
    scoresMatchInitial(
      homeScore,
      awayScore,
      advancesId,
      initialHome,
      initialAway,
      initialAdvancesTeamId
    );

  const isJornadaTopScorer = jornadaTopScorerGoals != null;

  return (
    <article
      className={`rounded-lg border px-3 py-2.5 ${
        isJornadaTopScorer
          ? "border-emerald-500/45 bg-emerald-500/[0.08] shadow-sm shadow-emerald-500/10"
          : "border-[var(--color-border)] bg-[var(--color-card)]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--color-muted-foreground)]">
        <span className="flex flex-wrap items-center gap-2">
          <span>
            {es.fixture.matchNumber} {matchNumber}
            {groupLetter ? ` · Grupo ${groupLetter}` : ` · ${PHASE_LABELS[phase]}`}
          </span>
          {isJornadaTopScorer && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200"
              title={es.pronosticos.jornadaTopScorerBadge}
            >
              <span aria-hidden className="text-sm leading-none">
                ⚽
              </span>
              <span className="tabular-nums">{jornadaTopScorerGoals}</span>
            </span>
          )}
          {adminOverridden && (
            <Link
              href="/transparencia?filter=admin"
              className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200"
            >
              {es.pronosticos.adminOverriddenBadge}
            </Link>
          )}
        </span>
        <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {formatMatchTime(kickoffAt)}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex justify-center">
          <PredictionTeamSide team={home} label={homeName} />
        </div>

        <div className="flex items-center justify-center gap-1.5">
          <ScoreStepper
            value={homeScore}
            onChange={onHomeChange}
            label={es.pronosticos.home}
            editable={!inputsDisabled}
          />
          <span className="text-[var(--color-muted-foreground)]">-</span>
          <ScoreStepper
            value={awayScore}
            onChange={onAwayChange}
            label={es.pronosticos.away}
            editable={!inputsDisabled}
          />
        </div>

        <div className="flex justify-center">
          <PredictionTeamSide team={away} label={awayName} />
        </div>
      </div>

      {venue && (
        <p className="mt-2 text-center text-xs text-[var(--color-muted-foreground)] sm:text-sm">
          {venue}
        </p>
      )}

      {isKnockout && isDraw && home && away && (
        <div className="mt-3 space-y-1">
          <p className="text-xs text-[var(--color-muted-foreground)]">{es.pronosticos.drawAdvanceHint}</p>
          <select
            value={advancesId ?? ""}
            disabled={inputsDisabled}
            onChange={(e) =>
              onAdvanceChange(e.target.value ? Number(e.target.value) : null)
            }
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm disabled:opacity-70"
          >
            <option value="">{es.pronosticos.selectAdvance}</option>
            <option value={home.id}>{home.name_es}</option>
            <option value={away.id}>{away.name_es}</option>
          </select>
        </div>
      )}

      <div className="mt-2 flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between">
          <span
            className={
              status === "error"
                ? "text-red-500"
                : status === "saved"
                  ? "text-green-600"
                  : "text-[var(--color-muted-foreground)]"
            }
          >
            {status === "saving" && es.pronosticos.save}
            {status === "saved" && es.pronosticos.saved}
            {status === "error" &&
              (unchangedPaidChange ? es.pronosticos.paidChangeUnchanged : es.pronosticos.saveError)}
          </span>
        </div>

        {paidChangeMode && (
          <div className="flex flex-col items-end gap-2">
            {changesExhausted && (
              <span className="max-w-full text-right text-xs text-amber-700 dark:text-amber-300">
                {es.pronosticos.paidChangeUsed}
              </span>
            )}
            {!changesExhausted && !paidChangeEligible && paidChangeBlockReason && (
              <span className="max-w-full text-right text-xs text-[var(--color-muted-foreground)]">
                {paidChangeBlockMessage(paidChangeBlockReason)}
              </span>
            )}
            {editingPaidChange && (
              <p className="w-full text-right text-xs text-[var(--color-muted-foreground)]">
                {es.pronosticos.paidChangeEditingHint}
              </p>
            )}
            {!editingPaidChange ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  disabled ||
                  changesExhausted ||
                  !paidChangeEligible
                }
                onClick={() => {
                  setStatus("idle");
                  setEditingPaidChange(true);
                }}
              >
                {es.pronosticos.paidChangeStart} ({changeCost} {es.pronosticos.pts})
              </Button>
            ) : (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={status === "saving"}
                  onClick={resetPaidChangeDraft}
                >
                  {es.pronosticos.paidChangeCancel}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    status === "saving" ||
                    homeScore === "" ||
                    awayScore === "" ||
                    unchangedPaidChange
                  }
                  onClick={applyPaidChange}
                >
                  {es.pronosticos.paidChangeApply} ({changeCost} {es.pronosticos.pts})
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
