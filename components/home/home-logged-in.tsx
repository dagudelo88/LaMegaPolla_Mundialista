import Link from "next/link";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { formatPoolAmount } from "@/lib/pool/calculate-pool";
import type { HomeDashboardData } from "@/lib/pool/load-home-data";
import { es } from "@/lib/i18n/es";
import { Button } from "@/components/ui/button";

interface HomeLoggedInProps extends HomeDashboardData {
  username: string | null;
}

function PrizeCard({
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
    <div className={`rounded-xl border-2 ${border} bg-[var(--color-card)] px-4 py-5 text-center`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {place}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{amount}</p>
      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{pct}% del pool</p>
    </div>
  );
}

export function HomeLoggedIn({ username, leaderboard, pool }: HomeLoggedInProps) {
  const fmt = (n: number) => formatPoolAmount(n, pool.currency);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-8">
      <header className="text-center">
        <p className="text-sm uppercase tracking-widest text-[var(--color-accent)]">
          Mundial 2026
        </p>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">{es.landing.loggedInTitle}</h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          {es.landing.loggedInWelcome}{" "}
          <span className="font-semibold text-[var(--color-accent)]">@{username ?? "..."}</span>
        </p>
      </header>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <h2 className="text-lg font-semibold">{es.landing.poolTitle}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {es.landing.poolHint}
        </p>
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          {es.landing.poolTieHint}
        </p>

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 border-b border-[var(--color-border)] py-2">
            <dt className="text-[var(--color-muted-foreground)]">{es.landing.poolParticipants}</dt>
            <dd className="font-semibold tabular-nums">{pool.activeParticipants}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-[var(--color-border)] py-2">
            <dt className="text-[var(--color-muted-foreground)]">{es.landing.poolContribution}</dt>
            <dd className="font-semibold tabular-nums">{fmt(pool.entryFee)}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-[var(--color-border)] py-2 sm:col-span-2">
            <dt className="text-[var(--color-muted-foreground)]">{es.landing.poolTotal}</dt>
            <dd className="text-lg font-bold tabular-nums text-[var(--color-primary)]">
              {fmt(pool.totalPool)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <PrizeCard
            place={es.landing.prizeFirst}
            amount={fmt(pool.firstPlace)}
            pct={pool.percentages.first}
            highlight="gold"
          />
          <PrizeCard
            place={es.landing.prizeSecond}
            amount={fmt(pool.secondPlace)}
            pct={pool.percentages.second}
            highlight="silver"
          />
          <PrizeCard
            place={es.landing.prizeThird}
            amount={fmt(pool.thirdPlace)}
            pct={pool.percentages.third}
            highlight="bronze"
          />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{es.landing.leaderboardTitle}</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {es.landing.leaderboardHint}
          </p>
        </div>
        <LeaderboardTable rows={leaderboard} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link href="/dashboard">{es.nav.dashboard}</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/pronosticos">{es.nav.predictions}</Link>
        </Button>
      </div>
    </section>
  );
}
