import Link from "next/link";
import { WhatsAppGroupLink } from "@/components/community/whatsapp-group-link";
import { PoolStatCard, PrizeCard } from "@/components/home/pool-cards";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { Button } from "@/components/ui/button";
import { formatPoolAmount } from "@/lib/pool/calculate-pool";
import type { HomeDashboardData } from "@/lib/pool/load-home-data";
import { es } from "@/lib/i18n/es";

interface HomeLoggedInProps extends HomeDashboardData {
  username: string | null;
  predictionsSubmitted?: boolean;
  whatsappGroupInviteUrl?: string | null;
}

export function HomeLoggedIn({
  username,
  leaderboard,
  pool,
  playerLinksEnabled,
  registeredParticipants,
  paidParticipants,
  predictionsSubmitted = true,
  whatsappGroupInviteUrl = null,
}: HomeLoggedInProps) {
  const fmt = (n: number) => formatPoolAmount(n, pool.currency);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-8">
      {!predictionsSubmitted && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
          <p>{es.landing.predictionsPendingBanner}</p>
          <Button asChild size="sm" variant="outline" className="mt-3 border-amber-500/40">
            <Link href="/pronosticos">{es.landing.predictionsPendingCta}</Link>
          </Button>
        </div>
      )}

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
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          {es.landing.poolContribution}: {fmt(pool.entryFee)}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <PoolStatCard
            label={es.landing.poolStatPaid}
            value={String(paidParticipants)}
          />
          <PoolStatCard
            label={es.landing.poolStatRegistered}
            value={String(registeredParticipants)}
            hint={es.landing.poolStatRegisteredHint}
          />
          <PoolStatCard
            label={es.landing.poolStatTotal}
            value={fmt(pool.totalPool)}
            highlight
          />
        </div>

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
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{es.landing.leaderboardTitle}</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {playerLinksEnabled ? es.landing.leaderboardHintWithLinks : es.landing.leaderboardHint}
            </p>
          </div>
          {whatsappGroupInviteUrl ? (
            <WhatsAppGroupLink inviteUrl={whatsappGroupInviteUrl} />
          ) : null}
        </div>
        <LeaderboardTable
          rows={leaderboard}
          highlightUsername={username}
          playerLinksEnabled={playerLinksEnabled}
        />
      </div>
    </section>
  );
}
