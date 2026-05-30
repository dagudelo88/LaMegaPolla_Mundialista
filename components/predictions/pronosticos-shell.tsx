"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PronosticosPayload } from "@/app/actions/predictions";
import { BracketSimulatorPanel } from "@/components/predictions/bracket-simulator-panel";
import { GroupStagePanel } from "@/components/predictions/group-stage-panel";
import { KnockoutPanel } from "@/components/predictions/knockout-panel";
import { SchedulePredictionsPanel } from "@/components/predictions/schedule-predictions-panel";
import { LockedStateBanner } from "@/components/predictions/locked-state-banner";
import { SubmittedEditableBanner } from "@/components/predictions/submitted-editable-banner";
import { SubmissionSummary } from "@/components/predictions/submission-summary";
import { countProgress } from "@/lib/predictions/helpers";
import { es } from "@/lib/i18n/es";
import { formatAppDateTime } from "@/lib/matches/format-datetime";
import { Button } from "@/components/ui/button";
import type { MatchPhase } from "@/types/database";

type Tab = "schedule" | "groups" | "bracket" | "knockout" | "summary";

interface PronosticosShellProps {
  data: PronosticosPayload;
  maxChangesPerDay: number;
  changeCosts: Partial<Record<MatchPhase, number>>;
  mode?: "edit" | "view";
  viewUsername?: string;
  viewRank?: number | null;
}

export function PronosticosShell({
  data,
  maxChangesPerDay,
  changeCosts,
  mode = "edit",
  viewUsername,
  viewRank,
}: PronosticosShellProps) {
  const router = useRouter();
  const isViewMode = mode === "view";
  const [tab, setTab] = useState<Tab>("groups");

  const groupMatchIds = useMemo(
    () => data.matches.filter((m) => m.phase === "group_stage").map((m) => m.id),
    [data.matches]
  );
  const knockoutMatchIds = useMemo(
    () => data.matches.filter((m) => m.phase !== "group_stage").map((m) => m.id),
    [data.matches]
  );

  const progress = countProgress(groupMatchIds, knockoutMatchIds, data.predictions);

  const deadlinePassed = data.deadlinePassed;
  const paidChangeMode = !isViewMode && data.isSubmitted && deadlinePassed;
  const freeEditBlocked = isViewMode || paidChangeMode;
  const groupComplete = progress.groupDone >= progress.groupTotal && progress.groupTotal > 0;
  const knockoutUnlocked = groupComplete || isViewMode;
  const changesExhausted = data.changesUsedToday >= maxChangesPerDay;

  const handleSaved = () => router.refresh();

  const tabs: { id: Tab; label: string }[] = isViewMode
    ? [
        { id: "schedule", label: es.pronosticos.tabSchedule },
        { id: "groups", label: es.pronosticos.tabGroups },
        { id: "bracket", label: es.pronosticos.tabBracket },
        { id: "knockout", label: es.pronosticos.tabKnockout },
      ]
    : [
        { id: "schedule", label: es.pronosticos.tabSchedule },
        { id: "groups", label: es.pronosticos.tabGroups },
        { id: "bracket", label: es.pronosticos.tabBracket },
        { id: "knockout", label: es.pronosticos.tabKnockout },
        { id: "summary", label: es.pronosticos.tabSummary },
      ];

  if (!data.matches.length) {
    return <p className="text-sm">{es.pronosticos.noMatches}</p>;
  }

  return (
    <div className="space-y-6">
      {isViewMode && viewUsername && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {es.playerPredictions.viewingLabel}{" "}
            <strong className="text-[var(--color-foreground)]">@{viewUsername}</strong>
            {viewRank != null && (
              <>
                {" "}
                · {es.playerPredictions.rankLabel} #{viewRank}
              </>
            )}
          </p>
          <p className="mt-2 text-sm">
            {es.playerPredictions.pointsLabel}:{" "}
            <strong className="tabular-nums">{data.totalPoints}</strong>
            {!data.isSubmitted && (
              <span className="ml-2 text-[var(--color-muted-foreground)]">
                ({es.playerPredictions.notSubmitted})
              </span>
            )}
          </p>
        </div>
      )}

      {!isViewMode && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {es.pronosticos.deadline}:{" "}
            <strong>{formatAppDateTime(data.globalDeadline)}</strong>
          </p>
          <p className="mt-2 text-sm">
            {es.pronosticos.progress}: {progress.groupDone}/{progress.groupTotal}{" "}
            {es.pronosticos.groupProgress.toLowerCase()} · {progress.thirdPlaceDone}/8{" "}
            {es.pronosticos.thirdProgress.toLowerCase()} · {progress.knockoutDone}/
            {progress.knockoutTotal} {es.pronosticos.knockoutProgress.toLowerCase()}
          </p>
        </div>
      )}

      {!isViewMode && data.isSubmitted && deadlinePassed && (
        <LockedStateBanner
          submittedAt={data.submittedAt}
          totalPoints={data.totalPoints}
          changesUsedToday={data.changesUsedToday}
          maxChangesPerDay={maxChangesPerDay}
        />
      )}

      {!isViewMode && data.isSubmitted && !deadlinePassed && (
        <SubmittedEditableBanner
          submittedAt={data.submittedAt}
          globalDeadline={data.globalDeadline}
        />
      )}

      <nav className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-border)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {!isViewMode && paidChangeMode && (tab === "bracket" || tab === "summary") && (
        <div className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-4">
          <p className="text-sm">{es.pronosticos.paidChangeTabHint}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setTab("schedule")}>
              {es.pronosticos.tabSchedule}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setTab("groups")}>
              {es.pronosticos.tabGroups}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setTab("knockout")}>
              {es.pronosticos.tabKnockout}
            </Button>
          </div>
        </div>
      )}

      {tab === "schedule" && (
        <SchedulePredictionsPanel
          matches={data.matches}
          teams={data.teams}
          predictions={data.predictions}
          groupResults={data.groupResults}
          advancingThirdGroups={data.advancingThirdGroups}
          knockoutDefs={data.knockoutDefs}
          jornadaMetaByKey={data.jornadaMetaByKey}
          disabled={freeEditBlocked}
          knockoutUnlocked={knockoutUnlocked || data.isSubmitted}
          paidChangeMode={paidChangeMode}
          paidChangeEligibleByMatchId={data.paidChangeEligibleByMatchId}
          paidChangeBlockReasonByMatchId={data.paidChangeBlockReasonByMatchId}
          changeCosts={changeCosts}
          changesExhausted={changesExhausted}
          onSaved={isViewMode ? undefined : handleSaved}
        />
      )}

      {tab === "groups" && (
        <GroupStagePanel
          matches={data.matches}
          predictions={data.predictions}
          disabled={freeEditBlocked}
          paidChangeMode={paidChangeMode}
          paidChangeEligibleByMatchId={data.paidChangeEligibleByMatchId}
          paidChangeBlockReasonByMatchId={data.paidChangeBlockReasonByMatchId}
          changeCost={changeCosts.group_stage}
          changesExhausted={changesExhausted}
          onSaved={isViewMode ? undefined : handleSaved}
        />
      )}

      {tab === "bracket" && (
        <BracketSimulatorPanel
          teams={data.teams}
          groupResults={data.groupResults}
          groupComplete={groupComplete || isViewMode}
        />
      )}

      {tab === "knockout" && (
        <KnockoutPanel
          matches={data.matches}
          teams={data.teams}
          predictions={data.predictions}
          groupResults={data.groupResults}
          advancingThirdGroups={data.advancingThirdGroups}
          knockoutDefs={data.knockoutDefs}
          disabled={isViewMode}
          unlocked={knockoutUnlocked || data.isSubmitted}
          paidChangeMode={paidChangeMode}
          paidChangeEligibleByMatchId={data.paidChangeEligibleByMatchId}
          paidChangeBlockReasonByMatchId={data.paidChangeBlockReasonByMatchId}
          changeCosts={changeCosts}
          changesExhausted={changesExhausted}
          onSaved={isViewMode ? undefined : handleSaved}
        />
      )}

      {!isViewMode && tab === "summary" && (
        <SubmissionSummary
          groupDone={progress.groupDone}
          groupTotal={progress.groupTotal}
          knockoutDone={progress.knockoutDone}
          knockoutTotal={progress.knockoutTotal}
          thirdDone={progress.thirdPlaceDone}
          disabled={data.isSubmitted && deadlinePassed}
          deadlinePassed={deadlinePassed}
          knockoutUnlocked={knockoutUnlocked || data.isSubmitted}
          teams={data.teams}
          matches={data.matches}
          predictions={data.predictions}
          groupResults={data.groupResults}
          advancingThirdGroups={data.advancingThirdGroups}
          knockoutDefs={data.knockoutDefs}
        />
      )}
    </div>
  );
}
