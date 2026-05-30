"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { savePredictionDraft, applyPaidPredictionChange } from "@/app/actions/predictions";
import { TeamWithFlag } from "@/components/predictions/team-flag";
import { es } from "@/lib/i18n/es";
import type { PaidChangeBlockReason } from "@/lib/predictions/paid-change-eligibility";
import type { MatchPhase } from "@/types/database";
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
  changeCost?: number;
  adminOverridden?: boolean;
  onSaved?: () => void;
}

export function MatchPredictionCard({
  matchId,
  matchNumber,
  phase,
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
  changeCost,
  adminOverridden,
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isKnockout = phase !== "group_stage";
  const isDraw =
    homeScore !== "" && awayScore !== "" && Number(homeScore) === Number(awayScore);

  useEffect(() => {
    setHomeScore(initialHome === "" ? "" : String(initialHome));
    setAwayScore(initialAway === "" ? "" : String(initialAway));
    setAdvancesId(initialAdvancesTeamId);
  }, [initialHome, initialAway, initialAdvancesTeamId]);

  const persist = useCallback(
    async (h: string, a: string, adv: number | null) => {
      if (disabled && !paidChangeMode) return;
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
        if (paidChangeMode && predictionId) {
          const before = `${initialHome}-${initialAway}`;
          const after = `${hn}-${an}`;
          const cost = changeCost ?? 0;
          const confirmed = window.confirm(
            es.pronosticos.paidChangeConfirm
              .replace("{cost}", String(cost))
              .replace("{before}", before)
              .replace("{after}", after)
          );
          if (!confirmed) {
            setStatus("idle");
            return;
          }
          await applyPaidPredictionChange(predictionId, hn, an, phase, {
            predictedAdvancesTeamId: hn === an ? adv : null,
          });
        } else {
          await savePredictionDraft(matchId, hn, an, {
            predictedAdvancesTeamId: hn === an ? adv : null,
          });
        }
        setStatus("saved");
        onSaved?.();
      } catch {
        setStatus("error");
      }
    },
    [disabled, paidChangeMode, predictionId, matchId, phase, isKnockout, onSaved, changeCost, initialHome, initialAway]
  );

  const scheduleSave = useCallback(
    (h: string, a: string, adv: number | null) => {
      if (timer.current) clearTimeout(timer.current);
      if (paidChangeMode) return;
      timer.current = setTimeout(() => persist(h, a, adv), 500);
    },
    [persist, paidChangeMode]
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

  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted-foreground)]">
        <span>
          {es.pronosticos.matchNumber} #{matchNumber}
        </span>
        <span>{new Date(kickoffAt).toLocaleString("es")}</span>
        {adminOverridden && (
          <Link
            href="/transparencia?filter=admin"
            className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          >
            {es.pronosticos.adminOverriddenBadge}
          </Link>
        )}
        {venue && <span className="w-full sm:w-auto">{venue}</span>}
      </div>

      <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-col items-center sm:items-end">
          {home ? (
            <TeamWithFlag name={home.name_es} fifaCode={home.fifa_code} align="right" />
          ) : (
            <p className="text-center text-sm font-medium sm:text-right">{homeName}</p>
          )}
          <label className="sr-only">{es.pronosticos.home}</label>
          <input
            type="number"
            min={0}
            max={20}
            value={homeScore}
            disabled={disabled && !paidChangeMode}
            onChange={(e) => onHomeChange(e.target.value)}
            className="mt-2 w-16 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-center text-lg font-bold"
          />
        </div>
        <span className="text-center text-sm font-semibold text-[var(--color-muted-foreground)]">
          {es.pronosticos.vs}
        </span>
        <div className="flex flex-col items-center sm:items-start">
          {away ? (
            <TeamWithFlag name={away.name_es} fifaCode={away.fifa_code} align="left" />
          ) : (
            <p className="text-center text-sm font-medium sm:text-left">{awayName}</p>
          )}
          <label className="sr-only">{es.pronosticos.away}</label>
          <input
            type="number"
            min={0}
            max={20}
            value={awayScore}
            disabled={disabled && !paidChangeMode}
            onChange={(e) => onAwayChange(e.target.value)}
            className="mt-2 w-16 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-center text-lg font-bold"
          />
        </div>
      </div>

      {isKnockout && isDraw && home && away && (
        <div className="mt-3 space-y-1">
          <p className="text-xs text-[var(--color-muted-foreground)]">{es.pronosticos.drawAdvanceHint}</p>
          <select
            value={advancesId ?? ""}
            disabled={disabled && !paidChangeMode}
            onChange={(e) =>
              onAdvanceChange(e.target.value ? Number(e.target.value) : null)
            }
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm"
          >
            <option value="">{es.pronosticos.selectAdvance}</option>
            <option value={home.id}>{home.name_es}</option>
            <option value={away.id}>{away.name_es}</option>
          </select>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-xs">
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
          {status === "error" && es.pronosticos.saveError}
        </span>
        {paidChangeMode && (
          <div className="flex flex-col items-end gap-1">
            {!paidChangeEligible && paidChangeBlockReason && (
              <span className="max-w-[14rem] text-right text-xs text-[var(--color-muted-foreground)]">
                {paidChangeBlockReason === "match_same_day"
                  ? es.pronosticos.paidChangeSameDayBlocked
                  : es.pronosticos.paidChangeNotScheduled}
              </span>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={
                disabled ||
                !paidChangeEligible ||
                homeScore === "" ||
                awayScore === ""
              }
              onClick={() => persist(homeScore, awayScore, advancesId)}
            >
              {es.pronosticos.paidChange} ({changeCost} {es.pronosticos.pts})
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}
