import Link from "next/link";
import { Button } from "@/components/ui/button";
import { es } from "@/lib/i18n/es";

export function HomeGuestLanding() {
  return (
    <section className="flex min-h-[calc(100dvh-3.5rem-4rem)] flex-col justify-center py-4">
      <div className="max-w-md space-y-5 text-left md:max-w-lg">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-accent)]">
          Mundial 2026
        </p>
        <h1 className="sr-only">{es.landing.heroTitle}</h1>
        <p className="text-xl font-semibold leading-snug text-white md:text-2xl">
          {es.landing.heroSubtitle}
        </p>
        <p className="rounded-xl border border-white/15 bg-[var(--color-card)]/80 px-4 py-3 text-sm leading-relaxed text-[var(--color-muted-foreground)] backdrop-blur-sm">
          {es.landing.authNote}
        </p>
        <p className="text-sm font-medium text-[var(--color-accent)]">
          {es.landing.inviteNote}
        </p>

        <div className="flex w-full max-w-sm flex-col gap-3 pt-2">
          <Button asChild size="lg" className="w-full">
            <Link href="/join">{es.landing.ctaRegister}</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full border-white/25 bg-[var(--color-card)]/60 backdrop-blur-sm hover:bg-[var(--color-card)]/80"
          >
            <Link href="/login">{es.landing.ctaLogin}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
