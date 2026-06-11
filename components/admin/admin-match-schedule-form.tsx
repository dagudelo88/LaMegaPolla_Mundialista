"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { updateMatchSchedule } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  computePredictionDeadline,
  DEFAULT_DEADLINE_OFFSET_MINUTES,
} from "@/lib/matches/compute-prediction-deadline";
import {
  formatAppDateTime,
  formatFifaScheduleDateHeader,
  formatMatchTime,
} from "@/lib/matches/format-datetime";
import { bogotaLocalToUtc, utcToBogotaLocal } from "@/lib/matches/venue-timezone";
import { es } from "@/lib/i18n/es";
import type { MatchWithTeams } from "@/types/database";

interface AdminMatchScheduleFormProps {
  match: MatchWithTeams;
  deadlineOffsetMinutes?: number;
}

function hasScheduleChanges(
  match: MatchWithTeams,
  fifaScheduleDate: string,
  kickoffDateColombia: string,
  kickoffTimeColombia: string
): boolean {
  const bogota = utcToBogotaLocal(match.kickoff_at);
  return (
    match.fifa_schedule_date !== fifaScheduleDate ||
    bogota.localDate !== kickoffDateColombia ||
    bogota.localTime !== kickoffTimeColombia
  );
}

export function AdminMatchScheduleForm({
  match,
  deadlineOffsetMinutes = DEFAULT_DEADLINE_OFFSET_MINUTES,
}: AdminMatchScheduleFormProps) {
  const router = useRouter();
  const initialBogota = utcToBogotaLocal(match.kickoff_at);

  const [fifaScheduleDate, setFifaScheduleDate] = useState(match.fifa_schedule_date);
  const [kickoffDateColombia, setKickoffDateColombia] = useState(initialBogota.localDate);
  const [kickoffTimeColombia, setKickoffTimeColombia] = useState(initialBogota.localTime);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = hasScheduleChanges(
    match,
    fifaScheduleDate,
    kickoffDateColombia,
    kickoffTimeColombia
  );

  const preview = useMemo(() => {
    try {
      const kickoffIso = bogotaLocalToUtc(kickoffDateColombia, kickoffTimeColombia);
      const deadline = computePredictionDeadline(
        new Date(kickoffIso),
        deadlineOffsetMinutes
      );
      return {
        header: formatFifaScheduleDateHeader(fifaScheduleDate),
        time: formatMatchTime(kickoffIso),
        deadline: formatAppDateTime(deadline),
      };
    } catch {
      return null;
    }
  }, [
    fifaScheduleDate,
    kickoffDateColombia,
    kickoffTimeColombia,
    deadlineOffsetMinutes,
  ]);

  const showStatusWarning = match.status !== "scheduled";

  async function handleSave() {
    if (!hasChanges) {
      setError(es.admin.scheduleNoChangesError);
      return;
    }

    setPending(true);
    setMessage(null);
    setError(null);
    try {
      await updateMatchSchedule(match.id, {
        fifaScheduleDate,
        kickoffDateColombia,
        kickoffTimeColombia,
      });
      setMessage(es.admin.scheduleSaved);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.admin.errorGeneric);
    } finally {
      setPending(false);
    }
  }

  function handleReset() {
    const bogota = utcToBogotaLocal(match.kickoff_at);
    setFifaScheduleDate(match.fifa_schedule_date);
    setKickoffDateColombia(bogota.localDate);
    setKickoffTimeColombia(bogota.localTime);
    setMessage(null);
    setError(null);
  }

  return (
    <div className="mt-3 space-y-3 border-t border-[var(--color-border)] pt-3">
      {showStatusWarning && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          {es.admin.scheduleWarningStatus.replace("{status}", match.status)}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-muted-foreground)]">
            {es.admin.scheduleFifaDateLabel}
          </span>
          <input
            type="date"
            value={fifaScheduleDate}
            onChange={(e) => {
              setFifaScheduleDate(e.target.value);
              setError(null);
            }}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-muted-foreground)]">
            {es.admin.scheduleKickoffDateLabel}
          </span>
          <input
            type="date"
            value={kickoffDateColombia}
            onChange={(e) => {
              setKickoffDateColombia(e.target.value);
              setError(null);
            }}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-muted-foreground)]">
            {es.admin.scheduleKickoffTimeLabel}
          </span>
          <input
            type="time"
            value={kickoffTimeColombia}
            onChange={(e) => {
              setKickoffTimeColombia(e.target.value.slice(0, 5));
              setError(null);
            }}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5"
          />
        </label>
      </div>

      {preview && (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {es.admin.schedulePreview
            .replace("{header}", preview.header)
            .replace("{time}", preview.time)
            .replace("{deadline}", preview.deadline)}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending || !hasChanges} onClick={handleSave}>
          {pending ? es.admin.saving : es.admin.scheduleSave}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || !hasChanges}
          onClick={handleReset}
        >
          {es.admin.cancelCorrection}
        </Button>
      </div>

      {message && <p className="text-xs text-green-600">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
