import { TeamWithFlag } from "@/components/predictions/team-flag";
import { es } from "@/lib/i18n/es";
import type { TransparencyMatchTeam, TransparencyScoreChange } from "@/types/database";

interface ScoreChangeDisplayProps {
  homeTeam: TransparencyMatchTeam | null;
  awayTeam: TransparencyMatchTeam | null;
  scoreChange: TransparencyScoreChange;
}

function ScoreCell({
  value,
  changed,
}: {
  value: number | null;
  changed: boolean;
}) {
  return (
    <span
      className={`inline-flex min-w-[1.75rem] justify-center rounded px-1.5 py-0.5 font-mono text-sm font-bold tabular-nums ${
        changed
          ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
          : "text-[var(--color-muted-foreground)]"
      }`}
    >
      {value ?? "—"}
    </span>
  );
}

function TeamScoreRow({
  side,
  team,
  before,
  after,
}: {
  side: "home" | "away";
  team: TransparencyMatchTeam | null;
  before: number | null;
  after: number | null;
}) {
  const changed = before !== after;
  const sideLabel = side === "home" ? es.transparency.homeTeam : es.transparency.awayTeam;

  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-2 gap-y-1 sm:grid-cols-[5rem_1fr_auto_1.25rem_auto]">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {sideLabel}
      </span>
      <div className="min-w-0">
        {team ? (
          <TeamWithFlag
            name={team.name}
            fifaCode={team.fifaCode}
            align="left"
            flagSize="sm"
            layout="inline"
          />
        ) : (
          <span className="text-sm text-[var(--color-muted-foreground)]">—</span>
        )}
      </div>
      <ScoreCell value={before} changed={changed} />
      <span className="text-center text-xs text-[var(--color-muted-foreground)]">→</span>
      <ScoreCell value={after} changed={changed} />
    </div>
  );
}

function AdvanceRow({
  before,
  after,
}: {
  before: TransparencyMatchTeam | null;
  after: TransparencyMatchTeam | null;
}) {
  if (!before && !after) return null;
  const changed =
    before?.fifaCode !== after?.fifaCode || before?.name !== after?.name;

  return (
    <div className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2">
      <p className="mb-2 text-xs font-medium text-[var(--color-muted-foreground)]">
        {es.transparency.advancePick}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {before ? (
          <TeamWithFlag
            name={before.name}
            fifaCode={before.fifaCode}
            align="left"
            flagSize="sm"
            layout="inline"
          />
        ) : (
          <span className="text-[var(--color-muted-foreground)]">—</span>
        )}
        <span className="text-[var(--color-muted-foreground)]">→</span>
        {after ? (
          <span
            className={
              changed
                ? "rounded-md bg-[var(--color-primary)]/10 px-1"
                : undefined
            }
          >
            <TeamWithFlag
              name={after.name}
              fifaCode={after.fifaCode}
              align="left"
              flagSize="sm"
              layout="inline"
            />
          </span>
        ) : (
          <span className="text-[var(--color-muted-foreground)]">—</span>
        )}
      </div>
    </div>
  );
}

export function ScoreChangeDisplay({
  homeTeam,
  awayTeam,
  scoreChange,
}: ScoreChangeDisplayProps) {
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted-foreground)]">
        <span>{es.transparency.scoreChangeTitle}</span>
        <span className="flex gap-3">
          <span>{es.transparency.beforeLabel}</span>
          <span>→</span>
          <span>{es.transparency.afterLabel}</span>
        </span>
      </div>
      <TeamScoreRow
        side="home"
        team={homeTeam}
        before={scoreChange.beforeHome}
        after={scoreChange.afterHome}
      />
      <TeamScoreRow
        side="away"
        team={awayTeam}
        before={scoreChange.beforeAway}
        after={scoreChange.afterAway}
      />
      <AdvanceRow
        before={scoreChange.beforeAdvancesTeam}
        after={scoreChange.afterAdvancesTeam}
      />
    </div>
  );
}
