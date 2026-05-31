import Link from "next/link";
import { PoolStatCard, PrizeCard } from "@/components/home/pool-cards";
import { Button } from "@/components/ui/button";
import { formatPoolAmount, type PoolPayouts } from "@/lib/pool/calculate-pool";
import { es } from "@/lib/i18n/es";

interface HomeGuestLandingProps {
  registeredParticipants: number;
  potentialPool: PoolPayouts;
}

export function HomeGuestLanding({
  registeredParticipants,
  potentialPool,
}: HomeGuestLandingProps) {
  const fmt = (n: number) => formatPoolAmount(n, potentialPool.currency);
  const feeLabel = formatPoolAmount(potentialPool.entryFee, potentialPool.currency);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-8">
      <header className="space-y-4 text-center md:text-left">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-accent)]">
          Mundial 2026
        </p>
        <h1 className="text-3xl font-bold md:text-4xl">{es.landing.heroTitle}</h1>
        <p className="text-lg leading-snug text-[var(--color-muted-foreground)] md:text-xl">
          {es.landing.heroSubtitle}
        </p>
      </header>

      <div className="rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-card)] p-6">
        <h2 className="text-center text-lg font-semibold md:text-left">{es.landing.guestPromoTitle}</h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-[var(--color-muted-foreground)] md:text-left">
          {es.landing.guestPromoLead}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <PoolStatCard
            label={es.landing.poolStatRegistered}
            value={String(registeredParticipants)}
            hint={es.landing.poolStatRegisteredHint}
          />
          <PoolStatCard
            label={es.landing.guestPoolPotential}
            value={fmt(potentialPool.totalPool)}
            hint={es.landing.guestPoolPotentialHint.replace("{fee}", feeLabel)}
            highlight
          />
        </div>

        <p className="mt-6 text-center text-sm font-medium text-[var(--color-accent)] md:text-left">
          {es.landing.guestPrizesTitle}
        </p>
        <p className="mt-1 text-center text-xs text-[var(--color-muted-foreground)] md:text-left">
          {es.landing.guestPrizesHint}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <PrizeCard
            place={es.landing.prizeFirst}
            amount={fmt(potentialPool.firstPlace)}
            pct={potentialPool.percentages.first}
            highlight="gold"
          />
          <PrizeCard
            place={es.landing.prizeSecond}
            amount={fmt(potentialPool.secondPlace)}
            pct={potentialPool.percentages.second}
            highlight="silver"
          />
          <PrizeCard
            place={es.landing.prizeThird}
            amount={fmt(potentialPool.thirdPlace)}
            pct={potentialPool.percentages.third}
            highlight="bronze"
          />
        </div>

        <p className="mt-6 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-center text-sm leading-relaxed md:text-left">
          {es.landing.guestPromoCta}
        </p>
      </div>

      <p className="rounded-xl border border-white/15 bg-[var(--color-card)]/80 px-4 py-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
        {es.landing.authNote}
      </p>
      <p className="text-sm font-medium text-[var(--color-accent)]">{es.landing.inviteNote}</p>

      <div className="flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
        <Button asChild size="lg" className="w-full sm:flex-1">
          <Link href="/join">{es.landing.ctaRegister}</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="w-full border-white/25 sm:flex-1"
        >
          <Link href="/login">{es.landing.ctaLogin}</Link>
        </Button>
      </div>
    </section>
  );
}
