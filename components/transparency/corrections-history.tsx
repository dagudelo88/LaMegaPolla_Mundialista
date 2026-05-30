"use client";

import { useState, useTransition } from "react";
import {
  loadTransparencyHistory,
  type TransparencyFilter,
} from "@/app/actions/transparency";
import { TeamWithFlag } from "@/components/predictions/team-flag";
import { ScoreChangeDisplay } from "@/components/transparency/score-change-display";
import { es } from "@/lib/i18n/es";
import { formatAppDateTime } from "@/lib/matches/format-datetime";
import type { TransparencyEntry } from "@/types/database";
import { Button } from "@/components/ui/button";

const FILTERS: { key: TransparencyFilter; label: string }[] = [
  { key: "all", label: es.transparency.filterAll },
  { key: "paid", label: es.transparency.filterPaid },
  { key: "admin", label: es.transparency.filterAdmin },
  { key: "results", label: es.transparency.filterResults },
];

function kindLabel(kind: TransparencyEntry["kind"]): string {
  if (kind === "paid_change") return es.transparency.typePaid;
  if (kind === "admin_prediction") return es.transparency.typeAdmin;
  return es.transparency.typeResult;
}

function kindBadgeClass(kind: TransparencyEntry["kind"]): string {
  if (kind === "paid_change") return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200";
  if (kind === "admin_prediction") return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
  return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200";
}

function MatchHeader({ entry }: { entry: TransparencyEntry }) {
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {entry.matchLabel}
      </p>
      {entry.homeTeam && entry.awayTeam ? (
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 sm:justify-start">
          <TeamWithFlag
            name={entry.homeTeam.name}
            fifaCode={entry.homeTeam.fifaCode}
            align="left"
            flagSize="sm"
            layout="inline"
          />
          <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
            {es.pronosticos.vs}
          </span>
          <TeamWithFlag
            name={entry.awayTeam.name}
            fifaCode={entry.awayTeam.fifaCode}
            align="left"
            flagSize="sm"
            layout="inline"
          />
        </div>
      ) : (
        <p className="text-sm text-[var(--color-muted-foreground)]">{entry.matchLabel}</p>
      )}
    </div>
  );
}

interface CorrectionsHistoryProps {
  initialEntries: TransparencyEntry[];
  initialHasMore: boolean;
  initialFilter?: TransparencyFilter;
}

export function CorrectionsHistory({
  initialEntries,
  initialHasMore,
  initialFilter = "all",
}: CorrectionsHistoryProps) {
  const [filter, setFilter] = useState<TransparencyFilter>(initialFilter);
  const [entries, setEntries] = useState(initialEntries);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(0);
  const [pending, startTransition] = useTransition();

  function applyFilter(next: TransparencyFilter) {
    setFilter(next);
    setPage(0);
    startTransition(async () => {
      const result = await loadTransparencyHistory({ filter: next, page: 0 });
      setEntries(result.entries);
      setHasMore(result.hasMore);
    });
  }

  function loadMore() {
    const nextPage = page + 1;
    startTransition(async () => {
      const result = await loadTransparencyHistory({ filter, page: nextPage });
      setEntries((prev) => [...prev, ...result.entries]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            disabled={pending}
            onClick={() => applyFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              filter === f.key
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!entries.length ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">{es.transparency.empty}</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 font-medium ${kindBadgeClass(entry.kind)}`}>
                  {kindLabel(entry.kind)}
                </span>
                <span className="text-[var(--color-muted-foreground)]">
                  {formatAppDateTime(entry.createdAt)}
                </span>
              </div>

              {entry.kind !== "result_correction" && (
                <p className="mt-2 text-sm">
                  <strong>@{entry.playerUsername}</strong>
                </p>
              )}

              <MatchHeader entry={entry} />

              <ScoreChangeDisplay
                homeTeam={entry.homeTeam}
                awayTeam={entry.awayTeam}
                scoreChange={entry.scoreChange}
              />

              <p className="mt-3 text-sm">
                {entry.kind === "paid_change" && entry.pointsSpent != null ? (
                  <span className="font-semibold text-red-600">
                    {es.transparency.pointsSpent.replace("{count}", String(entry.pointsSpent))}
                  </span>
                ) : entry.kind === "admin_prediction" ? (
                  <span className="text-[var(--color-muted-foreground)]">
                    {es.transparency.noCost}
                    {entry.actorUsername
                      ? ` · ${es.transparency.byAdmin.replace("{username}", entry.actorUsername)}`
                      : ""}
                  </span>
                ) : entry.actorUsername ? (
                  <span className="text-[var(--color-muted-foreground)]">
                    {es.transparency.byAdmin.replace("{username}", entry.actorUsername)}
                  </span>
                ) : null}
              </p>
              {entry.reason && (
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{entry.reason}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <Button type="button" variant="outline" disabled={pending} onClick={loadMore}>
          {es.transparency.loadMore}
        </Button>
      )}
    </div>
  );
}
