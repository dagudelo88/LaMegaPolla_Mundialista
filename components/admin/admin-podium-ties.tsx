import { formatPoolAmount } from "@/lib/pool/calculate-pool";
import type { PodiumTieGroup } from "@/lib/pool/load-leaderboard";
import { es } from "@/lib/i18n/es";

interface AdminPodiumTiesProps {
  ties: PodiumTieGroup[];
  currency: string;
}

export function AdminPodiumTies({ ties, currency }: AdminPodiumTiesProps) {
  const fmt = (n: number) => formatPoolAmount(n, currency);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <h2 className="text-lg font-semibold">{es.admin.podiumTiesTitle}</h2>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {es.admin.podiumTiesHint}
      </p>

      {ties.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
          {es.admin.podiumTiesNone}
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {ties.map((tie) => (
            <li
              key={tie.rank}
              className="rounded-lg border border-[var(--color-border)] p-4"
            >
              <p className="font-semibold">
                {es.admin.podiumTiesPlace.replace("{rank}", String(tie.rank))}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {tie.usernames.map((u) => `@${u}`).join(", ")}
              </p>
              <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--color-muted-foreground)]">Premio del puesto</dt>
                  <dd className="font-semibold tabular-nums">{fmt(tie.totalPrize)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--color-muted-foreground)]">
                    {es.admin.podiumTiesSuggested}
                  </dt>
                  <dd className="font-semibold tabular-nums text-[var(--color-primary)]">
                    {fmt(tie.suggestedPerPerson)}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
