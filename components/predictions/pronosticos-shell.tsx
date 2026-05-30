"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PronosticosPayload } from "@/app/actions/predictions";
import { BracketSimulatorPanel } from "@/components/predictions/bracket-simulator-panel";
import { GroupStagePanel } from "@/components/predictions/group-stage-panel";
import { KnockoutPanel } from "@/components/predictions/knockout-panel";
import { LockedStateBanner } from "@/components/predictions/locked-state-banner";
import { SubmissionSummary } from "@/components/predictions/submission-summary";
import { countProgress } from "@/lib/predictions/helpers";
import { es } from "@/lib/i18n/es";
import { formatAppDateTime } from "@/lib/matches/format-datetime";
import { Button } from "@/components/ui/button";
import type { MatchPhase } from "@/types/database";

type Tab = "groups" | "bracket" | "knockout" | "summary";

interface PronosticosShellProps {
  data: PronosticosPayload;
  maxChangesPerDay: number;
  changeCosts: Partial<Record<MatchPhase, number>>;
}

export function PronosticosShell({ data, maxChangesPerDay, changeCosts }: PronosticosShellProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(data.isSubmitted ? "groups" : "groups");

  const groupMatchIds = useMemo(
    () => data.matches.filter((m) => m.phase === "group_stage").map((m) => m.id),
    [data.matches]
  );
  const knockoutMatchIds = useMemo(
    () => data.matches.filter((m) => m.phase !== "group_stage").map((m) => m.id),
    [data.matches]
  );

  const progress = countProgress(groupMatchIds, knockoutMatchIds, data.predictions);

  const deadlinePassed = new Date() >= new Date(data.globalDeadline);
  const groupComplete = progress.groupDone >= progress.groupTotal && progress.groupTotal > 0;
  const knockoutUnlocked = groupComplete;
  const changesExhausted = data.changesUsedToday >= maxChangesPerDay;

  const handleSaved = () => router.refresh();

  const tabs: { id: Tab; label: string }[] = [
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

      {data.isSubmitted && (
        <LockedStateBanner
          submittedAt={data.submittedAt}
          totalPoints={data.totalPoints}
          changesUsedToday={data.changesUsedToday}
          maxChangesPerDay={maxChangesPerDay}
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

      {data.isSubmitted && (tab === "bracket" || tab === "summary") && (
        <div className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-4">
          <p className="text-sm">{es.pronosticos.paidChangeTabHint}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setTab("groups")}>
              {es.pronosticos.tabGroups}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setTab("knockout")}>
              {es.pronosticos.tabKnockout}
            </Button>
          </div>
        </div>
      )}

      {tab === "groups" && (
        <GroupStagePanel
          matches={data.matches}
          predictions={data.predictions}
          disabled={data.isSubmitted}
          paidChangeMode={data.isSubmitted}
          paidChangeEligibleByMatchId={data.paidChangeEligibleByMatchId}
          paidChangeBlockReasonByMatchId={data.paidChangeBlockReasonByMatchId}
          changeCost={changeCosts.group_stage}
          changesExhausted={changesExhausted}
          onSaved={handleSaved}
        />
      )}

      {tab === "bracket" && (
        <BracketSimulatorPanel
          teams={data.teams}
          groupResults={data.groupResults}
          groupComplete={groupComplete}
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
          disabled={false}
          unlocked={knockoutUnlocked || data.isSubmitted}
          paidChangeMode={data.isSubmitted}
          paidChangeEligibleByMatchId={data.paidChangeEligibleByMatchId}
          paidChangeBlockReasonByMatchId={data.paidChangeBlockReasonByMatchId}
          changeCosts={changeCosts}
          changesExhausted={changesExhausted}
          onSaved={handleSaved}
        />
      )}

      {tab === "summary" && (
        <SubmissionSummary
          groupDone={progress.groupDone}
          groupTotal={progress.groupTotal}
          knockoutDone={progress.knockoutDone}
          knockoutTotal={progress.knockoutTotal}
          thirdDone={progress.thirdPlaceDone}
          disabled={data.isSubmitted}
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
