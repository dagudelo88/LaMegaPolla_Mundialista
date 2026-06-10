"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  adminSubmitAllCompletePredictions,
  adminSubmitUserPredictions,
} from "@/app/actions/admin-predictions";
import { Button } from "@/components/ui/button";
import { es } from "@/lib/i18n/es";
import { formatAppDateTime } from "@/lib/matches/format-datetime";
import type { UserSubmissionReadiness } from "@/lib/predictions/submission-readiness";

export interface SubmissionProgress {
  groupDone: number;
  groupTotal: number;
  knockoutDone: number;
  knockoutTotal: number;
}

interface AdminPlayerSubmissionCardProps {
  userId: string;
  username: string;
  submissionReadiness: UserSubmissionReadiness;
  submittedAt: string | null;
  progress: SubmissionProgress;
}

function describeSubmissionBlockers(errors: string[]): string {
  if (errors.includes("already_submitted")) {
    return es.admin.submitUserAlreadySubmitted;
  }
  if (errors.some((e) => e.startsWith("group_incomplete"))) {
    return es.admin.submitUserMissingGroups;
  }
  if (errors.some((e) => e.startsWith("knockout_incomplete"))) {
    return es.admin.submitUserMissingKnockout;
  }
  if (errors.some((e) => e.startsWith("knockout_missing_advance"))) {
    return es.admin.submitUserMissingAdvances;
  }
  if (errors.some((e) => e.startsWith("third_place"))) {
    return es.admin.submitUserMissingThirds;
  }
  return es.admin.submitUserIncompleteHint;
}

export function AdminPlayerSubmissionCard({
  userId,
  username,
  submissionReadiness,
  submittedAt,
  progress,
}: AdminPlayerSubmissionCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { ready, alreadySubmitted, validation } = submissionReadiness;
  const groupsComplete = progress.groupDone >= progress.groupTotal && progress.groupTotal > 0;
  const knockoutComplete =
    progress.knockoutDone >= progress.knockoutTotal && progress.knockoutTotal > 0;

  function handleSubmit() {
    const confirmMessage = es.admin.submitUserConfirm.replace("{user}", username);
    if (!window.confirm(confirmMessage)) return;

    startTransition(async () => {
      setMessage(null);
      setError(null);
      try {
        await adminSubmitUserPredictions(userId);
        setMessage(es.admin.submitUserSuccess);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : es.admin.submitUserError);
      }
    });
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{es.admin.submitUserSectionTitle}</h3>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {es.admin.submitUserSectionHint}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            alreadySubmitted
              ? "bg-green-500/15 text-green-700 dark:text-green-400"
              : ready
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
          }`}
        >
          {alreadySubmitted
            ? es.admin.submitUserStatusSubmitted
            : ready
              ? es.admin.submitUserStatusReady
              : es.admin.submitUserStatusDraft}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--color-border)] px-3 py-2">
          <dt className="text-[var(--color-muted-foreground)]">{es.admin.submitUserGroupsProgress}</dt>
          <dd className="mt-1 font-mono font-semibold">
            {progress.groupDone}/{progress.groupTotal}
          </dd>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] px-3 py-2">
          <dt className="text-[var(--color-muted-foreground)]">
            {es.admin.submitUserKnockoutProgress}
          </dt>
          <dd className="mt-1 font-mono font-semibold">
            {progress.knockoutDone}/{progress.knockoutTotal}
          </dd>
        </div>
      </dl>

      {alreadySubmitted && submittedAt && (
        <p className="mt-3 text-sm text-green-700 dark:text-green-400">
          {es.admin.submitUserSubmittedAt.replace("{date}", formatAppDateTime(submittedAt))}
        </p>
      )}

      {!alreadySubmitted && (
        <>
          <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
            {ready
              ? es.admin.submitUserReadyHint
              : describeSubmissionBlockers(validation.errors)}
          </p>
          <Button
            type="button"
            className="mt-4"
            disabled={pending || !ready || !groupsComplete || !knockoutComplete}
            onClick={handleSubmit}
          >
            {pending ? es.admin.saving : es.admin.submitUserButton}
          </Button>
        </>
      )}

      {message && (
        <p className="mt-3 text-sm text-green-700 dark:text-green-400" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface AdminSubmitAllCompleteButtonProps {
  readyUsers: { userId: string; username: string }[];
}

export function AdminSubmitAllCompleteButton({ readyUsers }: AdminSubmitAllCompleteButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!readyUsers.length) {
    return null;
  }

  function handleSubmitAll() {
    const names = readyUsers.map((u) => `@${u.username}`).join(", ");
    const confirmMessage = es.admin.submitAllConfirm
      .replace("{count}", String(readyUsers.length))
      .replace("{users}", names);
    if (!window.confirm(confirmMessage)) return;

    startTransition(async () => {
      setMessage(null);
      setError(null);
      try {
        const result = await adminSubmitAllCompletePredictions();
        setMessage(
          es.admin.submitAllSuccess.replace("{count}", String(result.submitted.length))
        );
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : es.admin.submitUserError);
      }
    });
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
      <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
        {es.admin.submitAllTitle.replace("{count}", String(readyUsers.length))}
      </p>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {es.admin.submitAllHint}
      </p>
      <ul className="mt-2 list-inside list-disc text-sm text-[var(--color-muted-foreground)]">
        {readyUsers.map((u) => (
          <li key={u.userId}>@{u.username}</li>
        ))}
      </ul>
      <Button
        type="button"
        className="mt-3"
        disabled={pending}
        onClick={handleSubmitAll}
      >
        {pending ? es.admin.saving : es.admin.submitAllButton}
      </Button>
      {message && (
        <p className="mt-2 text-sm text-green-700 dark:text-green-400" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
