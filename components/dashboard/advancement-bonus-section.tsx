"use client";

import { useState } from "react";
import { TeamWithFlag } from "@/components/predictions/team-flag";
import type { PlayerAdvancementBonusRow } from "@/lib/scoring/load-player-points-summary";
import { es } from "@/lib/i18n/es";

interface AdvancementBonusSectionProps {
  rows: PlayerAdvancementBonusRow[];
}

export function AdvancementBonusSection({ rows }: AdvancementBonusSectionProps) {
  const roundRows = rows.filter((r) => r.type === "round");
  const matchRows = rows.filter((r) => r.type === "match");

  const [expandedKey, setExpandedKey] = useState<string | null>(
    roundRows.find((r) => r.teams.length > 0)?.bonusKey ?? null
  );

  if (!roundRows.length && !matchRows.length) return null;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
      <h2 className="text-lg font-semibold">{es.dashboard.advancementTitle}</h2>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {es.dashboard.advancementHint}
      </p>

      <div className="mt-4 space-y-3">
        {roundRows.map((row) => {
          const isExpanded = expandedKey === row.bonusKey;
          const showTeams = row.teams.length > 0;

          return (
            <div
              key={row.bonusKey}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{row.label}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {es.dashboard.advancementRoundSummary(
                      row.teams.length,
                      row.userTeamCount ?? row.teams.length,
                      row.incorrectCount ?? 0
                    )}
                  </p>
                  {row.pendingLiquidation && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {es.dashboard.advancementPendingLiquidation}
                    </p>
                  )}
                </div>
                <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{row.points}
                </p>
              </div>

              {row.points === 0 && row.teams.length === 0 && (
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                  {es.dashboard.advancementRoundNone}
                </p>
              )}

              {showTeams && (
                <div className="mt-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                    onClick={() =>
                      setExpandedKey(isExpanded ? null : row.bonusKey)
                    }
                  >
                    {isExpanded
                      ? es.dashboard.advancementHideTeams
                      : es.dashboard.advancementShowTeams(row.teams.length)}
                  </button>
                  {isExpanded && (
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {row.teams.map((team) => (
                        <li
                          key={team.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-border)] px-2 py-1.5 text-sm"
                        >
                          <TeamWithFlag
                            name={team.name_es}
                            fifaCode={team.fifa_code}
                            align="left"
                            flagSize="sm"
                            layout="inline"
                          />
                          <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                            +2
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {matchRows.map((row) => (
          <div
            key={row.bonusKey}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{row.label}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {es.dashboard.advancementMatchHint}
                </p>
              </div>
              <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                +{row.points}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
