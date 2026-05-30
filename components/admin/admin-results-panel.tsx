"use client";

import { useMemo, useState } from "react";
import { resolveOfficialKnockoutBracket } from "@/app/actions/admin";
import { AdminMatchResultForm } from "@/components/admin/admin-match-result-form";
import { Button } from "@/components/ui/button";
import {
  formatMatchDateHeader,
  formatMatchDateSortKey,
} from "@/lib/matches/format-datetime";
import { es } from "@/lib/i18n/es";
import type { MatchWithTeams } from "@/types/database";

type StatusFilter = "pending" | "live" | "finished" | "all";

interface AdminResultsPanelProps {
  matches: MatchWithTeams[];
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

export function AdminResultsPanel({ matches }: AdminResultsPanelProps) {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [bracketPending, setBracketPending] = useState(false);
  const [bracketMessage, setBracketMessage] = useState<string | null>(null);
  const [bracketError, setBracketError] = useState<string | null>(null);

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
      const key = formatMatchDateSortKey(match.kickoff_at);
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
              {formatMatchDateHeader(dayMatches[0]!.kickoff_at)}
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
