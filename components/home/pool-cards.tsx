export function PoolStatCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/40 px-4 py-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p
        className={`mt-3 tabular-nums font-bold ${
          highlight ? "text-2xl text-[var(--color-primary)] md:text-3xl" : "text-3xl md:text-4xl"
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 max-w-[14rem] text-xs leading-snug text-[var(--color-muted-foreground)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PrizeCard({
  place,
  amount,
  pct,
  highlight,
}: {
  place: string;
  amount: string;
  pct: number;
  highlight?: "gold" | "silver" | "bronze";
}) {
  const border =
    highlight === "gold"
      ? "border-[var(--color-accent)]"
      : highlight === "silver"
        ? "border-slate-400"
        : highlight === "bronze"
          ? "border-amber-700"
          : "border-[var(--color-border)]";

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border-2 ${border} bg-[var(--color-card)] px-4 py-5 text-center`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {place}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{amount}</p>
      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{pct}% del pool</p>
    </div>
  );
}
